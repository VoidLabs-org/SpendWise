package vehicle

import (
	"context"
	"log"
	"time"

	rabbitmq "spendwise/rabbitmq"
)

// Publisher wraps the shared RabbitMQ client for vehicle-service's two outbound events.
// A nil Publisher (RabbitMQ not configured, e.g. missing RABBITMQ_URL) makes every publish
// call a no-op so the service still works locally without a broker. The underlying channel
// auto-reconnects on a dead connection (see rabbitmq.ReconnectingChannel) — a plain
// *amqp.Channel has no way to recover once the broker drops an idle connection, which happens
// in practice even against CloudAMQP.
type Publisher struct {
	rc *rabbitmq.ReconnectingChannel
}

func NewPublisher(rc *rabbitmq.ReconnectingChannel) *Publisher {
	return &Publisher{rc: rc}
}

type expenseCreatedEvent struct {
	VehicleID string    `json:"vehicle_id"`
	UserID    string    `json:"user_id"`
	Category  string    `json:"category"`
	Amount    float64   `json:"amount"`
	Date      time.Time `json:"date"`
}

// PublishExpenseCreated fires vehicle.expense.created for any cost recorded against a
// vehicle — a fuel log (category "fuel"), a maintenance log (category "maintenance"), or a
// VehicleExpense (category is its own type, e.g. "insurance").
func (p *Publisher) PublishExpenseCreated(vehicleID, userID, category string, amount float64, date time.Time) error {
	if p == nil || p.rc == nil {
		return nil
	}
	return p.rc.Publish(rabbitmq.RoutingKeyVehicleExpenseCreated, expenseCreatedEvent{
		VehicleID: vehicleID,
		UserID:    userID,
		Category:  category,
		Amount:    amount,
		Date:      date,
	})
}

type reminderDueEvent struct {
	ReminderID string    `json:"reminder_id"`
	VehicleID  string    `json:"vehicle_id"`
	UserID     string    `json:"user_id"`
	Title      string    `json:"title"`
	Kind       string    `json:"kind"`
	DueDate    time.Time `json:"due_date"`
}

// PublishReminderDue fires vehicle.reminder.due for a reminder that has entered its
// notify window, per ReminderStore.DueForNotification.
func (p *Publisher) PublishReminderDue(r ReminderDue) error {
	if p == nil || p.rc == nil {
		return nil
	}
	return p.rc.Publish(rabbitmq.RoutingKeyVehicleReminderDue, reminderDueEvent{
		ReminderID: r.ID,
		VehicleID:  r.VehicleID,
		UserID:     r.UserID,
		Title:      r.Title,
		Kind:       r.Kind,
		DueDate:    r.DueDate,
	})
}

// RunReminderScanner periodically scans for reminders that have entered their notify
// window and publishes vehicle.reminder.due for each, marking it notified so it doesn't
// refire on the next tick. Runs once immediately, then on every tick, until ctx is done.
func RunReminderScanner(ctx context.Context, store *ReminderStore, publisher *Publisher, interval time.Duration) {
	scanRemindersOnce(ctx, store, publisher)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			scanRemindersOnce(ctx, store, publisher)
		}
	}
}

func scanRemindersOnce(ctx context.Context, store *ReminderStore, publisher *Publisher) {
	due, err := store.DueForNotification(ctx)
	if err != nil {
		log.Printf("reminder scan: failed to query due reminders: %v", err)
		return
	}

	for _, r := range due {
		if err := publisher.PublishReminderDue(r); err != nil {
			log.Printf("reminder scan: failed to publish vehicle.reminder.due for reminder %s: %v", r.ID, err)
			continue
		}
		if err := store.MarkNotified(ctx, r.ID); err != nil {
			log.Printf("reminder scan: failed to mark reminder %s notified: %v", r.ID, err)
		}
	}
}
