package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Handlers struct {
	store     *Store
	refresh   *RefreshStore
	blacklist *Blacklist
	tokens    *TokenIssuer
}

func NewHandlers(store *Store, refresh *RefreshStore, blacklist *Blacklist, tokens *TokenIssuer) *Handlers {
	return &Handlers{store: store, refresh: refresh, blacklist: blacklist, tokens: tokens}
}

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *Handlers) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.Password == "" || req.Name == "" {
		writeError(w, http.StatusBadRequest, "email, password, and name are required")
		return
	}
	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to process password")
		return
	}

	user, err := h.store.CreateUser(r.Context(), uuid.NewString(), req.Email, req.Name, hash)
	if err != nil {
		if errors.Is(err, ErrUserExists) {
			writeError(w, http.StatusConflict, "an account with this email already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	h.issueTokenPair(w, r, user)
}

func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	user, err := h.store.GetUserByEmail(r.Context(), req.Email)
	if err != nil || !VerifyPassword(user.PasswordHash, req.Password) {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	h.issueTokenPair(w, r, user)
}

func (h *Handlers) Refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.RefreshToken == "" {
		writeError(w, http.StatusBadRequest, "refresh_token is required")
		return
	}

	userID, err := h.refresh.Consume(r.Context(), req.RefreshToken)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid or expired refresh token")
		return
	}

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "user no longer exists")
		return
	}

	h.issueTokenPair(w, r, user)
}

func (h *Handlers) Logout(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	// Body is optional: logout should still revoke the presented access token even without a refresh token.
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.RefreshToken != "" {
		_ = h.refresh.Revoke(r.Context(), req.RefreshToken)
	}

	if claims, ok := claimsFromRequest(r, h.tokens); ok {
		ttl := time.Until(claims.ExpiresAt.Time)
		_ = h.blacklist.Add(r.Context(), claims.ID, ttl)
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) Validate(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromRequest(r, h.tokens)
	if !ok {
		writeError(w, http.StatusUnauthorized, "missing or invalid access token")
		return
	}

	blacklisted, err := h.blacklist.IsBlacklisted(r.Context(), claims.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to check token status")
		return
	}
	if blacklisted {
		writeError(w, http.StatusUnauthorized, "token has been revoked")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"user_id": claims.UserID,
		"email":   claims.Email,
	})
}

func (h *Handlers) issueTokenPair(w http.ResponseWriter, r *http.Request, user *User) {
	access, err := h.tokens.IssueAccessToken(user.ID, user.Email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to issue access token")
		return
	}
	refreshToken, err := h.refresh.Issue(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to issue refresh token")
		return
	}

	writeJSON(w, http.StatusOK, TokenPair{
		AccessToken:  access,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(h.tokens.AccessTokenTTL().Seconds()),
	})
}

func claimsFromRequest(r *http.Request, tokens *TokenIssuer) (*Claims, bool) {
	header := r.Header.Get("Authorization")
	tokenStr, ok := strings.CutPrefix(header, "Bearer ")
	if !ok || tokenStr == "" {
		return nil, false
	}
	claims, err := tokens.ValidateAccessToken(tokenStr)
	if err != nil {
		return nil, false
	}
	return claims, true
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
