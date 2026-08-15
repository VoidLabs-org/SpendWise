package auth

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// Blacklist marks an access token's jti as revoked until its natural expiry,
// so a logged-out access token stops validating immediately instead of living out its TTL.
type Blacklist struct {
	client *redis.Client
}

func NewBlacklist(client *redis.Client) *Blacklist {
	return &Blacklist{client: client}
}

func (b *Blacklist) Add(ctx context.Context, jti string, ttl time.Duration) error {
	if ttl <= 0 {
		return nil
	}
	return b.client.Set(ctx, blacklistKey(jti), "1", ttl).Err()
}

func (b *Blacklist) IsBlacklisted(ctx context.Context, jti string) (bool, error) {
	_, err := b.client.Get(ctx, blacklistKey(jti)).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func blacklistKey(jti string) string {
	return "blacklist:" + jti
}
