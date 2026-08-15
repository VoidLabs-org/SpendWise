package main

import (
	"log"
	"net/http"

	"github.com/joho/godotenv"

	"spendwise/api-gateway/internal/config"
	"spendwise/api-gateway/internal/gateway"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	handler := gateway.New(cfg)

	log.Printf("api-gateway listening on :%s", cfg.Port)
	log.Printf("  /auth          -> %s (public)", cfg.AuthServiceURL)
	log.Printf("  /finance       -> %q (protected)", cfg.FinanceServiceURL)
	log.Printf("  /vehicle       -> %q (protected)", cfg.VehicleServiceURL)
	log.Printf("  /notifications -> %q (protected)", cfg.NotifyServiceURL)

	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		log.Fatal(err)
	}
}
