package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var ErrInvalidToken = errors.New("invalid or expired token")

type Claims struct {
	UserID string `json:"sub"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

type TokenIssuer struct {
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewTokenIssuer(secret string, accessTTL, refreshTTL time.Duration) *TokenIssuer {
	return &TokenIssuer{secret: []byte(secret), accessTTL: accessTTL, refreshTTL: refreshTTL}
}

func (t *TokenIssuer) IssueAccessToken(userID, email string) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.NewString(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(t.accessTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   userID,
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(t.secret)
}

func (t *TokenIssuer) AccessTokenTTL() time.Duration {
	return t.accessTTL
}

func (t *TokenIssuer) RefreshTokenTTL() time.Duration {
	return t.refreshTTL
}

func (t *TokenIssuer) ValidateAccessToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(tok *jwt.Token) (interface{}, error) {
		if _, ok := tok.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return t.secret, nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
