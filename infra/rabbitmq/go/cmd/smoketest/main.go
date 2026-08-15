// Command smoketest proves the RabbitMQ topology actually works end-to-end against a live
// broker: declares the exchange and all 4 queues, publishes one test event per routing key,
// then consumes each back with manual ack. Run this after setting RABBITMQ_URL to confirm a
// new broker (e.g. a freshly created CloudAMQP instance) is wired up correctly.
package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	amqp "github.com/rabbitmq/amqp091-go"

	rabbitmq "spendwise/rabbitmq"
)

type target struct {
	routingKey string
	queueName  string
}

func main() {
	_ = godotenv.Load()
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		log.Fatal("RABBITMQ_URL is not set")
	}

	conn, ch, err := rabbitmq.Connect(url)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer conn.Close()
	defer ch.Close()

	if err := rabbitmq.DeclareExchange(ch); err != nil {
		log.Fatalf("declare exchange: %v", err)
	}
	fmt.Println("✓ exchange declared:", rabbitmq.EventsExchange)

	targets := []target{
		{rabbitmq.RoutingKeyVehicleExpenseCreated, rabbitmq.QueueFinanceVehicleExpenseCreated},
		{rabbitmq.RoutingKeyVehicleReminderDue, rabbitmq.QueueNotificationVehicleReminderDue},
		{rabbitmq.RoutingKeyFinanceBudgetExceeded, rabbitmq.QueueNotificationFinanceBudgetExceeded},
		{rabbitmq.RoutingKeyFinanceTransactionAdded, rabbitmq.QueueNotificationFinanceTransactionAdded},
	}

	for _, t := range targets {
		if err := rabbitmq.DeclareAndBindQueue(ch, t.queueName, t.routingKey); err != nil {
			log.Fatalf("declare/bind %s: %v", t.queueName, err)
		}
		fmt.Printf("✓ queue bound: %s -> %s\n", t.queueName, t.routingKey)
	}

	for _, t := range targets {
		payload := map[string]string{"smoketest": t.routingKey, "at": time.Now().UTC().Format(time.RFC3339)}
		if err := rabbitmq.Publish(ch, t.routingKey, payload); err != nil {
			log.Fatalf("publish %s: %v", t.routingKey, err)
		}
		fmt.Printf("✓ published to %s\n", t.routingKey)
	}

	for _, t := range targets {
		if err := consumeOne(ch, t.queueName); err != nil {
			log.Fatalf("consume %s: %v", t.queueName, err)
		}
	}

	fmt.Println("\nAll 4 routing keys published and consumed successfully. Topology is live.")
}

// consumeOne pulls exactly one message off queueName, prints it, and acks it — a bounded
// version of rabbitmq.Consume (which loops forever), suited for a one-shot smoke test.
func consumeOne(ch *amqp.Channel, queueName string) error {
	msgs, err := ch.Consume(queueName, "", false, false, false, false, nil)
	if err != nil {
		return err
	}

	select {
	case msg := <-msgs:
		fmt.Printf("✓ consumed from %s: %s\n", queueName, string(msg.Body))
		return msg.Ack(false)
	case <-time.After(5 * time.Second):
		return fmt.Errorf("timed out waiting for a message on %s", queueName)
	}
}
