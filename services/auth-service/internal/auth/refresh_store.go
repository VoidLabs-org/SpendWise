package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

var ErrRefreshTokenInvalid = errors.New("refresh token invalid or expired")

// RefreshStore persists refresh tokens hashed in Redis, keyed by their hash, mapping to a user ID.
// Tokens are single-use: a refresh call deletes the old token and issues a new one (rotation),
// so a stolen-and-reused refresh token is detectable and Redis TTL bounds exposure automatically.
type RefreshStore struct {
	client *redis.Client
	ttl    time.Duration
}

func NewRefreshStore(client *redis.Client, ttl time.Duration) *RefreshStore {
	return &RefreshStore{client: client, ttl: ttl}
}

func (s *RefreshStore) Issue(ctx context.Context, userID string) (string, error) {
	token, err := randomToken()
	if err != nil {
		return "", err
	}
	if err := s.client.Set(ctx, refreshKey(token), userID, s.ttl).Err(); err != nil {
		return "", err
	}
	return token, nil
}

func (s *RefreshStore) Consume(ctx context.Context, token string) (string, error) {
	key := refreshKey(token)
	userID, err := s.client.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return "", ErrRefreshTokenInvalid
	}
	if err != nil {
		return "", err
	}
	if err := s.client.Del(ctx, key).Err(); err != nil {
		return "", err
	}
	return userID, nil
}

func (s *RefreshStore) Revoke(ctx context.Context, token string) error {
	return s.client.Del(ctx, refreshKey(token)).Err()
}

func refreshKey(token string) string {
	sum := sha256.Sum256([]byte(token))
	return "refresh:" + hex.EncodeToString(sum[:])
}

func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
