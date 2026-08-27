package main

import (
	"context"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	rabbitmq "spendwise/rabbitmq"
	"spendwise/vehicle-service/internal/config"
	"spendwise/vehicle-service/internal/vehicle"
)

const reminderScanInterval = time.Hour

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

	if err := db.Ping(ctx); err != nil {
		log.Fatalf("failed to ping postgres: %v", err)
	}

	store := vehicle.NewStore(db)
	if err := store.Migrate(ctx); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}
	fuelStore := vehicle.NewFuelStore(db)
	if err := fuelStore.Migrate(ctx); err != nil {
		log.Fatalf("failed to run fuel migrations: %v", err)
	}
	maintenanceStore := vehicle.NewMaintenanceStore(db)
	if err := maintenanceStore.Migrate(ctx); err != nil {
		log.Fatalf("failed to run maintenance migrations: %v", err)
	}
	expenseStore := vehicle.NewExpenseStore(db)
	if err := expenseStore.Migrate(ctx); err != nil {
		log.Fatalf("failed to run expense migrations: %v", err)
	}
	reminderStore := vehicle.NewReminderStore(db)
	if err := reminderStore.Migrate(ctx); err != nil {
		log.Fatalf("failed to run reminder migrations: %v", err)
	}
	analyticsStore := vehicle.NewAnalyticsStore(db)

	var publisher *vehicle.Publisher
	if cfg.RabbitMQURL != "" {
		rc, err := rabbitmq.NewReconnectingChannel(cfg.RabbitMQURL)
		if err != nil {
			log.Fatalf("failed to connect to rabbitmq: %v", err)
		}

		if err := rc.DeclareAndBindQueue(rabbitmq.QueueFinanceVehicleExpenseCreated, rabbitmq.RoutingKeyVehicleExpenseCreated); err != nil {
			log.Fatalf("failed to declare/bind %s: %v", rabbitmq.QueueFinanceVehicleExpenseCreated, err)
		}
		if err := rc.DeclareAndBindQueue(rabbitmq.QueueNotificationVehicleReminderDue, rabbitmq.RoutingKeyVehicleReminderDue); err != nil {
			log.Fatalf("failed to declare/bind %s: %v", rabbitmq.QueueNotificationVehicleReminderDue, err)
		}

		publisher = vehicle.NewPublisher(rc)
		log.Println("rabbitmq: connected and topology declared")
	} else {
		log.Println("rabbitmq: RABBITMQ_URL not set, running without event publishing")
	}

	go vehicle.RunReminderScanner(context.Background(), reminderStore, publisher, reminderScanInterval)

	dataStore := vehicle.NewDataStore(db)

	handlers := vehicle.NewHandlers(store, fuelStore, maintenanceStore, expenseStore, reminderStore, analyticsStore, dataStore, publisher)

	router := gin.Default()
	router.GET("/healthz", func(c *gin.Context) {
		c.Status(200)
	})
	handlers.RegisterRoutes(router)

	log.Printf("vehicle-service listening on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
