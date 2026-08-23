package config

import "os"

type Config struct {
	Port        string
	DatabaseURL string
	RabbitMQURL string
}

func Load() Config {
	return Config{
		Port:        getEnv("PORT", "8082"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/vehicle?sslmode=disable"),
		RabbitMQURL: getEnv("RABBITMQ_URL", ""),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
