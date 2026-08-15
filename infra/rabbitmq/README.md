# RabbitMQ config

Deferred to Part 3 of the backend plan — added once each service has a working core. Replaces the spec's original Kafka choice (see root plan Context for rationale). Will define exchanges/queues for: `vehicle.expense.created`, `vehicle.reminder.due`, `finance.budget.exceeded`, `finance.transaction.added`, using durable queues + manual consumer ack.
