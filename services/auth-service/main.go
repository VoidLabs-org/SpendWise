package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	"spendwise/auth-service/internal/auth"
	"spendwise/auth-service/internal/config"
)

func main() {
	_ = godotenv.Load() // optional: .env is picked up if present, real env vars always take priority
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to postgres: %v", err)
	}
	defer db.Close()

	store := auth.NewStore(db)
	if err := store.Migrate(ctx); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
	})
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("failed to connect to redis: %v", err)
	}
	defer redisClient.Close()

	tokens := auth.NewTokenIssuer(cfg.JWTSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)
	refreshStore := auth.NewRefreshStore(redisClient, cfg.RefreshTokenTTL)
	blacklist := auth.NewBlacklist(redisClient)
	handlers := auth.NewHandlers(store, refreshStore, blacklist, tokens)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /auth/register", handlers.Register)
	mux.HandleFunc("POST /auth/login", handlers.Login)
	mux.HandleFunc("POST /auth/refresh", handlers.Refresh)
	mux.HandleFunc("POST /auth/logout", handlers.Logout)
	mux.HandleFunc("GET /auth/validate", handlers.Validate)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	log.Printf("auth-service listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		log.Fatal(err)
	}
}
