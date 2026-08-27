package finance

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	rabbitmq "spendwise/rabbitmq"
)

// Publisher wraps the shared RabbitMQ client for finance-service's two outbound events. A nil
// Publisher (RabbitMQ not configured, e.g. missing RABBITMQ_URL) makes every publish call a
// no-op so the service still works locally without a broker — same pattern as vehicle-service.
// The underlying channel auto-reconnects on a dead connection (see
// rabbitmq.ReconnectingChannel) — a plain *amqp.Channel has no way to recover once the broker
// drops an idle connection, which happens in practice even against CloudAMQP.
type Publisher struct {
	rc *rabbitmq.ReconnectingChannel
}

func NewPublisher(rc *rabbitmq.ReconnectingChannel) *Publisher {
	return &Publisher{rc: rc}
}

type transactionAddedEvent struct {
	TransactionID string    `json:"transaction_id"`
	UserID        string    `json:"user_id"`
	Category      string    `json:"category"`
	Amount        float64   `json:"amount"`
	OccurredAt    time.Time `json:"occurred_at"`
}

func (p *Publisher) PublishTransactionAdded(t Transaction) error {
	if p == nil || p.rc == nil {
		return nil
	}
	return p.rc.Publish(rabbitmq.RoutingKeyFinanceTransactionAdded, transactionAddedEvent{
		TransactionID: t.ID,
		UserID:        t.UserID,
		Category:      t.Category,
		Amount:        t.Amount,
		OccurredAt:    t.OccurredAt,
	})
}

type budgetExceededEvent struct {
	BudgetID  string  `json:"budget_id"`
	UserID    string  `json:"user_id"`
	Category  string  `json:"category"`
	Month     string  `json:"month"`
	Threshold int     `json:"threshold"`
	Limit     float64 `json:"limit"`
	Spent     float64 `json:"spent"`
}

func (p *Publisher) PublishBudgetExceeded(c ThresholdCrossing) error {
	if p == nil || p.rc == nil {
		return nil
	}
	return p.rc.Publish(rabbitmq.RoutingKeyFinanceBudgetExceeded, budgetExceededEvent{
		BudgetID:  c.Budget.ID,
		UserID:    c.Budget.UserID,
		Category:  c.Budget.Category,
		Month:     c.Budget.Month,
		Threshold: c.Threshold,
		Limit:     c.Budget.LimitAmount,
		Spent:     c.Budget.Spent,
	})
}

// vehicleExpenseCreatedEvent mirrors vehicle-service's publisher payload exactly
// (services/vehicle-service/internal/vehicle/events.go's expenseCreatedEvent).
type vehicleExpenseCreatedEvent struct {
	VehicleID string    `json:"vehicle_id"`
	UserID    string    `json:"user_id"`
	Category  string    `json:"category"`
	Amount    float64   `json:"amount"`
	Date      time.Time `json:"date"`
}

type eventEnvelope struct {
	Type       string          `json:"type"`
	OccurredAt time.Time       `json:"occurred_at"`
	Data       json.RawMessage `json:"data"`
}

// RunConsumerWithReconnect keeps a vehicle.expense.created consumer alive indefinitely,
// reconnecting from scratch whenever the connection drops. This matters in practice: a broker
// (including CloudAMQP's free tier) can silently close an idle connection, and a plain
// ch.Consume loop exits cleanly with no error in that case — indistinguishable from a graceful
// shutdown unless something actively retries. Meant to run in its own goroutine; never returns.
func RunConsumerWithReconnect(amqpURL string, txns *TransactionStore, budgets *BudgetStore, publisher *Publisher) {
	const retryDelay = 5 * time.Second

	for {
		conn, ch, err := rabbitmq.Connect(amqpURL)
		if err != nil {
			log.Printf("rabbitmq consumer: connect failed: %v, retrying in %s", err, retryDelay)
			time.Sleep(retryDelay)
			continue
		}

		if err := rabbitmq.DeclareExchange(ch); err != nil {
			log.Printf("rabbitmq consumer: declare exchange failed: %v, retrying in %s", err, retryDelay)
			conn.Close()
			time.Sleep(retryDelay)
			continue
		}
		if err := rabbitmq.DeclareAndBindQueue(ch, rabbitmq.QueueFinanceVehicleExpenseCreated, rabbitmq.RoutingKeyVehicleExpenseCreated); err != nil {
			log.Printf("rabbitmq consumer: declare/bind queue failed: %v, retrying in %s", err, retryDelay)
			conn.Close()
			time.Sleep(retryDelay)
			continue
		}

		log.Println("rabbitmq consumer: connected, listening for vehicle.expense.created")
		consumeVehicleExpenseCreated(ch, txns, budgets, publisher)

		log.Printf("rabbitmq consumer: disconnected, reconnecting in %s", retryDelay)
		conn.Close()
		time.Sleep(retryDelay)
	}
}

// consumeVehicleExpenseCreated blocks until ch's connection is lost, auto-creating a
// "Transport" transaction for every vehicle.expense.created event — the spec's "no
// double-entry for the user" requirement (2.7).
func consumeVehicleExpenseCreated(ch *amqp.Channel, txns *TransactionStore, budgets *BudgetStore, publisher *Publisher) {
	err := rabbitmq.Consume(ch, rabbitmq.QueueFinanceVehicleExpenseCreated, func(body []byte) error {
		var env eventEnvelope
		if err := json.Unmarshal(body, &env); err != nil {
			return fmt.Errorf("invalid event envelope: %w", err)
		}
		var evt vehicleExpenseCreatedEvent
		if err := json.Unmarshal(env.Data, &evt); err != nil {
			return fmt.Errorf("invalid vehicle.expense.created payload: %w", err)
		}

		// The subtype (fuel/maintenance/insurance/...) is embedded after the vehicle ID so
		// ReportStore.VehicleBreakdown can group by it later — evt.VehicleID is a UUID and
		// therefore contains no colons, so splitting on ":" unambiguously recovers both parts.
		source := "vehicle:" + evt.VehicleID + ":" + evt.Category
		t, err := txns.Create(context.Background(), evt.UserID, TransactionInput{
			Amount:     -evt.Amount,
			Category:   "Transport",
			Note:       humanizeVehicleCategory(evt.Category),
			OccurredAt: &evt.Date,
		}, &source)
		if err != nil {
			return fmt.Errorf("failed to record vehicle expense as transaction: %w", err)
		}

		if err := publisher.PublishTransactionAdded(*t); err != nil {
			log.Printf("failed to publish finance.transaction.added for vehicle-sourced transaction %s: %v", t.ID, err)
		}

		month := t.OccurredAt.Format("2006-01")
		if crossing, err := budgets.CheckThreshold(context.Background(), t.UserID, t.Category, month); err != nil {
			log.Printf("failed to check budget threshold for %s/%s/%s: %v", t.UserID, t.Category, month, err)
		} else if crossing != nil {
			if err := publisher.PublishBudgetExceeded(*crossing); err != nil {
				log.Printf("failed to publish finance.budget.exceeded: %v", err)
			}
		}

		return nil
	})
	if err != nil {
		log.Printf("vehicle.expense.created consumer stopped: %v", err)
	}
}

func humanizeVehicleCategory(category string) string {
	switch category {
	case "fuel":
		return "Fuel fill-up"
	case "maintenance":
		return "Vehicle maintenance"
	default:
		return "Vehicle expense (" + category + ")"
	}
}
