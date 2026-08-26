package rabbitmq

import (
	"sync"

	amqp "github.com/rabbitmq/amqp091-go"
)

// ReconnectingChannel wraps a mutex-guarded connection/channel pair that transparently redials
// and redeclares the exchange when a publish fails — a broker (CloudAMQP's free tier included)
// can silently close an idle connection, and a bare *amqp.Channel has no way to recover from
// that on its own. Safe for concurrent use from multiple goroutines (e.g. concurrent HTTP
// handlers), unlike a raw *amqp.Channel used directly for publishing.
type ReconnectingChannel struct {
	mu   sync.Mutex
	url  string
	conn *amqp.Connection
	ch   *amqp.Channel
}

func NewReconnectingChannel(amqpURL string) (*ReconnectingChannel, error) {
	rc := &ReconnectingChannel{url: amqpURL}
	if err := rc.reconnect(); err != nil {
		return nil, err
	}
	return rc, nil
}

func (rc *ReconnectingChannel) reconnect() error {
	conn, ch, err := Connect(rc.url)
	if err != nil {
		return err
	}
	if err := DeclareExchange(ch); err != nil {
		conn.Close()
		return err
	}
	if rc.conn != nil {
		rc.conn.Close() // best-effort close of the old, presumably-dead connection
	}
	rc.conn = conn
	rc.ch = ch
	return nil
}

// Publish tries once on the current channel; if that fails (most commonly a dead connection),
// it reconnects from scratch and retries exactly once more before giving up.
func (rc *ReconnectingChannel) Publish(routingKey string, data interface{}) error {
	rc.mu.Lock()
	defer rc.mu.Unlock()

	if err := Publish(rc.ch, routingKey, data); err == nil {
		return nil
	}

	if err := rc.reconnect(); err != nil {
		return err
	}
	return Publish(rc.ch, routingKey, data)
}

// DeclareAndBindQueue re-exposes the package-level helper through the managed channel, for
// callers that only hold a ReconnectingChannel (not a raw *amqp.Channel) at topology-setup time.
func (rc *ReconnectingChannel) DeclareAndBindQueue(queueName, routingKey string) error {
	rc.mu.Lock()
	defer rc.mu.Unlock()
	return DeclareAndBindQueue(rc.ch, queueName, routingKey)
}
