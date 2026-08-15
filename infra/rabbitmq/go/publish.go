package rabbitmq

import (
	"context"
	"encoding/json"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Event is the message body shape used for every domain event, documented in
// infra/rabbitmq/README.md.
type Event struct {
	Type       string      `json:"type"`
	OccurredAt time.Time   `json:"occurred_at"`
	Data       interface{} `json:"data"`
}

// Publish sends a persistent (delivery_mode 2) message so it survives a broker restart even
// while the consuming service is down — the RabbitMQ equivalent of Kafka's log retention,
// but only if both the queue is durable and the message is marked persistent like this.
func Publish(ch *amqp.Channel, routingKey string, data interface{}) error {
	event := Event{
		Type:       routingKey,
		OccurredAt: time.Now().UTC(),
		Data:       data,
	}

	body, err := json.Marshal(event)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return ch.PublishWithContext(ctx,
		EventsExchange,
		routingKey,
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Body:         body,
		},
	)
}
