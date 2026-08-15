package gateway

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"
)

var ErrUnauthorized = errors.New("unauthorized")

// AuthClient calls Auth Service's /auth/validate on every protected request, per the spec's
// gateway design — the gateway doesn't verify JWTs itself, it delegates to the service that
// owns token lifecycle (rotation, blacklisting) so there's a single source of truth.
type AuthClient struct {
	baseURL string
	client  *http.Client
}

func NewAuthClient(baseURL string) *AuthClient {
	return &AuthClient{baseURL: baseURL, client: &http.Client{Timeout: 5 * time.Second}}
}

type ValidateResult struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
}

func (c *AuthClient) Validate(bearerHeader string) (*ValidateResult, error) {
	req, err := http.NewRequest(http.MethodGet, c.baseURL+"/auth/validate", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", bearerHeader)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, ErrUnauthorized
	}

	var result ValidateResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}
