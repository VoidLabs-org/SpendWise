package rabbitmq

import amqp "github.com/rabbitmq/amqp091-go"

// Handler processes one event's raw JSON body. Return an error to nack-and-requeue the
// message instead of losing it — only a nil return acks, so a crash or error mid-processing
// leaves the event to be redelivered rather than silently dropped.
type Handler func(body []byte) error

// Consume runs handler for every message on queueName until the channel is closed. It uses
// manual ack (autoAck=false) — messages are only acknowledged after handler succeeds.
func Consume(ch *amqp.Channel, queueName string, handler Handler) error {
	msgs, err := ch.Consume(
		queueName,
		"",    // consumer tag (auto-generated)
		false, // autoAck — false: we ack manually below
		false, // exclusive
		false, // no-local (unused by RabbitMQ)
		false, // no-wait
		nil,
	)
	if err != nil {
		return err
	}

	for msg := range msgs {
		if err := handler(msg.Body); err != nil {
			_ = msg.Nack(false, true) // requeue for retry
			continue
		}
		_ = msg.Ack(false)
	}
	return nil
}
