package main

import (
	"context"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	rabbitmq "spendwise/rabbitmq"

	"spendwise/finance-service/internal/config"
	"spendwise/finance-service/internal/finance"
)

// Recurring transactions are date-granularity, not time-of-day, so a daily scan is sufficient —
// no need to poll as often as vehicle-service's hourly reminder scanner.
const recurringScanInterval = 24 * time.Hour

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

	categoryStore := finance.NewCategoryStore(db)
	if err := categoryStore.Migrate(ctx); err != nil {
		log.Fatalf("failed to run category migrations: %v", err)
	}
	if err := categoryStore.SeedDefaults(ctx); err != nil {
		log.Fatalf("failed to seed default categories: %v", err)
	}

	transactionStore := finance.NewTransactionStore(db)
	if err := transactionStore.Migrate(ctx); err != nil {
		log.Fatalf("failed to run transaction migrations: %v", err)
	}

	budgetStore := finance.NewBudgetStore(db)
	if err := budgetStore.Migrate(ctx); err != nil {
		log.Fatalf("failed to run budget migrations: %v", err)
	}

	reportStore := finance.NewReportStore(db)

	recurringStore := finance.NewRecurringTransactionStore(db, transactionStore)
	if err := recurringStore.Migrate(ctx); err != nil {
		log.Fatalf("failed to run recurring transaction migrations: %v", err)
	}

	var publisher *finance.Publisher
	if cfg.RabbitMQURL != "" {
		rc, err := rabbitmq.NewReconnectingChannel(cfg.RabbitMQURL)
		if err != nil {
			log.Fatalf("failed to connect to rabbitmq: %v", err)
		}

		if err := rc.DeclareAndBindQueue(rabbitmq.QueueFinanceVehicleExpenseCreated, rabbitmq.RoutingKeyVehicleExpenseCreated); err != nil {
			log.Fatalf("failed to declare/bind %s: %v", rabbitmq.QueueFinanceVehicleExpenseCreated, err)
		}
		if err := rc.DeclareAndBindQueue(rabbitmq.QueueNotificationFinanceBudgetExceeded, rabbitmq.RoutingKeyFinanceBudgetExceeded); err != nil {
			log.Fatalf("failed to declare/bind %s: %v", rabbitmq.QueueNotificationFinanceBudgetExceeded, err)
		}
		if err := rc.DeclareAndBindQueue(rabbitmq.QueueNotificationFinanceTransactionAdded, rabbitmq.RoutingKeyFinanceTransactionAdded); err != nil {
			log.Fatalf("failed to declare/bind %s: %v", rabbitmq.QueueNotificationFinanceTransactionAdded, err)
		}

		publisher = finance.NewPublisher(rc)
		log.Println("rabbitmq: connected and topology declared")

		go finance.RunConsumerWithReconnect(cfg.RabbitMQURL, transactionStore, budgetStore, publisher)
	} else {
		log.Println("rabbitmq: RABBITMQ_URL not set, running without event publishing/consuming")
	}

	go finance.RunRecurringScanner(context.Background(), recurringStore, budgetStore, publisher, recurringScanInterval)

	dataStore := finance.NewDataStore(db)

	handlers := finance.NewHandlers(transactionStore, categoryStore, budgetStore, reportStore, recurringStore, dataStore, publisher)

	router := gin.Default()
	router.GET("/healthz", func(c *gin.Context) {
		c.Status(200)
	})
	handlers.RegisterRoutes(router)

	log.Printf("finance-service listening on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
