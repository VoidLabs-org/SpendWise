package rabbitmq

import amqp "github.com/rabbitmq/amqp091-go"

// Connect dials the broker and opens a channel in one step — the common case for a service
// that just needs one channel for its own publishing/consuming.
func Connect(amqpURL string) (*amqp.Connection, *amqp.Channel, error) {
	conn, err := amqp.Dial(amqpURL)
	if err != nil {
		return nil, nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, nil, err
	}

	return conn, ch, nil
}
