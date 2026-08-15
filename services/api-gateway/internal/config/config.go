package config

import "os"

type Config struct {
	Port               string
	AuthServiceURL     string
	FinanceServiceURL  string
	VehicleServiceURL  string
	NotifyServiceURL   string
	AllowedOrigin      string
	RateLimitPerSecond float64
	RateLimitBurst     int
}

func Load() Config {
	return Config{
		Port:               getEnv("PORT", "8000"),
		AuthServiceURL:     getEnv("AUTH_SERVICE_URL", "http://localhost:8080"),
		FinanceServiceURL:  getEnv("FINANCE_SERVICE_URL", ""),
		VehicleServiceURL:  getEnv("VEHICLE_SERVICE_URL", ""),
		NotifyServiceURL:   getEnv("NOTIFICATION_SERVICE_URL", ""),
		AllowedOrigin:      getEnv("ALLOWED_ORIGIN", "*"),
		RateLimitPerSecond: 20,
		RateLimitBurst:     40,
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
