# RabbitMQ topology

One topic exchange, durable queues, manual ack — each service declares its own exchange/queue/
bindings on startup (idempotent; safe to call every boot, no separate provisioning step needed).

Hosted on **CloudAMQP** rather than a local Docker container — every service (and every teammate's
machine) points at the same managed instance instead of each running its own local broker.

- Management UI: the URL CloudAMQP gives you on the instance's dashboard.
- AMQP URL for services: the "AMQP URL" shown on the CloudAMQP instance page, shaped like
  `amqps://<user>:<password>@<host>/<vhost>` — note `amqps://` (TLS), not `amqp://`. Each service
  reads this from an env var (e.g. `RABBITMQ_URL`) rather than hardcoding it, and it should never be
  committed — put it in each service's `.env` (gitignored) alongside its other secrets.

**Verified live** against the team's CloudAMQP instance (`puffin.rmq2.cloudamqp.com`) via the
smoketest tool below — exchange declared, all 4 queues bound, all 4 routing keys published and
consumed with manual ack. The Python snippet follows the same declarations and is expected to
work the same way, but only the Go path has actually been exercised so far.

## Go package

`infra/rabbitmq/go/` (module `spendwise/rabbitmq`) wraps the topology below into ready-made Go
functions — `Connect`, `DeclareExchange`, `DeclareAndBindQueue`, `Publish`, `Consume` — instead of
hand-rolling `amqp091-go` calls per service. Finance Service and Vehicle Service are both Go and
pull this in via a `replace` directive in their own `go.mod`:

```
require spendwise/rabbitmq v0.0.0
replace spendwise/rabbitmq => ../../infra/rabbitmq/go
```

Notification Service (Python) can't use this package — it follows the per-language snippet
further down instead.

### Reconnecting publisher

A bare `*amqp.Channel` used directly for publishing has no way to recover if the broker closes an
idle connection — which CloudAMQP's free tier does silently from time to time. `ReconnectingChannel`
(`reconnecting_publisher.go`) wraps a mutex-guarded connection/channel pair that redials and
redeclares the exchange automatically on a failed publish, retrying once before giving up. It's
safe for concurrent use (e.g. multiple HTTP handlers publishing at once), unlike a raw channel.
This is what Finance Service actually uses (`finance.NewPublisher` takes a `*ReconnectingChannel`,
not a plain channel) — prefer it over the bare `Connect`/`Publish` functions for anything
long-running:

```go
rc, err := rabbitmq.NewReconnectingChannel(os.Getenv("RABBITMQ_URL"))
if err != nil { log.Fatal(err) }
if err := rc.DeclareAndBindQueue("finance-service.vehicle-expense-created", rabbitmq.RoutingKeyVehicleExpenseCreated); err != nil { log.Fatal(err) }
_ = rc.Publish(rabbitmq.RoutingKeyFinanceTransactionAdded, someEvent)
```

The plain `Connect`/`DeclareExchange`/`DeclareAndBindQueue`/`Publish`/`Consume` functions still
exist and are what `ReconnectingChannel` is built on — use them directly only for something
short-lived (like the smoketest below) where reconnect logic isn't worth the complexity.

### Smoke test

`infra/rabbitmq/go/cmd/smoketest` declares the whole topology, publishes one test event per
routing key, and consumes each back with manual ack — a quick way to confirm a broker (e.g. a
freshly created CloudAMQP instance) is wired up correctly before any real service depends on it.

```bash
cd infra/rabbitmq/go
cp .env.example .env   # fill in RABBITMQ_URL from your CloudAMQP instance's dashboard
go run ./cmd/smoketest
```

## Exchange

One topic exchange for all domain events:

| Name | Type | Durable |
|---|---|---|
| `spendwise.events` | `topic` | yes |

## Routing keys → queues

Each row is one event. The routing key is also used as the event name in the message body's `type` field.

| Routing key | Producer | Consumer | Queue name |
|---|---|---|---|
| `vehicle.expense.created` | Vehicle Service | Finance Service | `finance-service.vehicle-expense-created` |
| `vehicle.reminder.due` | Vehicle Service | Notification Service | `notification-service.vehicle-reminder-due` |
| `finance.budget.exceeded` | Finance Service | Notification Service | `notification-service.finance-budget-exceeded` |
| `finance.transaction.added` | Finance Service | Notification Service | `notification-service.finance-transaction-added` |

Queue naming convention: `<consuming-service>.<routing-key-with-dashes>`. If a service ever needs to
consume the same event as another service, it gets its own queue bound to the same routing key —
never share a queue across services, since RabbitMQ round-robins deliveries across a queue's consumers
rather than fanning out to all of them.

## Durability rules (why this matters instead of just using defaults)

An event should survive a consumer being offline when it's published — RabbitMQ doesn't do that
by default, you have to opt in on both ends:

1. **Exchange**: declare durable (`durable: true`).
2. **Queue**: declare durable (`durable: true`), and bind it to the exchange *before* the producer
   ever publishes — a topic exchange drops messages with no matching queue binding, it does not
   buffer them.
3. **Messages**: publish with `delivery_mode: 2` (persistent) — a non-persistent message is lost on
   broker restart even in a durable queue.
4. **Consumers**: use manual ack (`autoAck: false`), and only ack after the event is fully processed
   and persisted on your side. If your service crashes mid-processing, the unacked message gets
   redelivered instead of silently lost.

## Minimal per-language example

Each service declares the exchange, its own queue, and the binding on startup — this is idempotent,
so it's safe to run on every boot instead of needing a separate migration/provisioning script.

**Go** (`amqp091-go`) — connect using the `RABBITMQ_URL` env var (CloudAMQP's `amqps://...` URL):
```go
conn, _ := amqp.Dial(os.Getenv("RABBITMQ_URL"))
ch, _ := conn.Channel()
ch.ExchangeDeclare("spendwise.events", "topic", true, false, false, false, nil)
q, _ := ch.QueueDeclare("finance-service.vehicle-expense-created", true, false, false, false, nil)
ch.QueueBind(q.Name, "vehicle.expense.created", "spendwise.events", false, nil)
```

**Python** (`pika`):
```python
channel.exchange_declare(exchange="spendwise.events", exchange_type="topic", durable=True)
channel.queue_declare(queue="notification-service.vehicle-reminder-due", durable=True)
channel.queue_bind(queue="notification-service.vehicle-reminder-due",
                    exchange="spendwise.events", routing_key="vehicle.reminder.due")
```

## Message body shape

Keep it simple and consistent across all 4 event types:

```json
{
  "type": "vehicle.expense.created",
  "occurred_at": "2026-08-15T10:00:00Z",
  "data": { "...": "event-specific fields" }
}
```
