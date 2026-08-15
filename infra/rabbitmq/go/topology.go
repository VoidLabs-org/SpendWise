// Package rabbitmq is the shared RabbitMQ scaffolding for SpendWise's Go services
// (vehicle-service, and any other Go service that produces/consumes domain events).
// It mirrors the topology documented in infra/rabbitmq/README.md — that README is the
// source of truth for routing keys and queue names; this package just gives Go services
// a ready-made way to declare and use them instead of hand-rolling amqp091-go calls.
package rabbitmq

import amqp "github.com/rabbitmq/amqp091-go"

const EventsExchange = "spendwise.events"

// Routing keys, one per domain event. Keep these in sync with infra/rabbitmq/README.md.
const (
	RoutingKeyVehicleExpenseCreated   = "vehicle.expense.created"
	RoutingKeyVehicleReminderDue      = "vehicle.reminder.due"
	RoutingKeyFinanceBudgetExceeded   = "finance.budget.exceeded"
	RoutingKeyFinanceTransactionAdded = "finance.transaction.added"
)

// Queue names, one per (consuming service, event) pair — never share a queue across
// services, RabbitMQ round-robins a queue's deliveries across its consumers rather than
// fanning out to all of them.
const (
	QueueFinanceVehicleExpenseCreated        = "finance-service.vehicle-expense-created"
	QueueNotificationVehicleReminderDue      = "notification-service.vehicle-reminder-due"
	QueueNotificationFinanceBudgetExceeded   = "notification-service.finance-budget-exceeded"
	QueueNotificationFinanceTransactionAdded = "notification-service.finance-transaction-added"
)

// DeclareExchange asserts the shared topic exchange exists. Idempotent — safe to call on
// every service startup.
func DeclareExchange(ch *amqp.Channel) error {
	return ch.ExchangeDeclare(
		EventsExchange,
		"topic",
		true,  // durable
		false, // auto-deleted
		false, // internal
		false, // no-wait
		nil,
	)
}

// DeclareAndBindQueue asserts a durable queue exists and is bound to the shared exchange
// under the given routing key. Idempotent — safe to call on every service startup.
func DeclareAndBindQueue(ch *amqp.Channel, queueName, routingKey string) error {
	if _, err := ch.QueueDeclare(
		queueName,
		true,  // durable
		false, // auto-delete
		false, // exclusive
		false, // no-wait
		nil,
	); err != nil {
		return err
	}
	return ch.QueueBind(queueName, routingKey, EventsExchange, false, nil)
}
