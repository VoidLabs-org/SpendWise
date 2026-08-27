# Finance Service

Go + Gin · owner: Member 1 · port 8081

Transactions, categories, and budgets — plus the consumer side of the vehicle→finance
integration: every `vehicle.expense.created` event auto-creates a "Transport" transaction, so
vehicle costs never need double entry. Same conventions as `auth-service`/`vehicle-service`.

## Endpoints

All routes read the caller's identity from the `X-User-Id` header, which the API Gateway sets
after validating the JWT — this service does not verify tokens itself.

| Method | Path | Notes |
|---|---|---|
| POST | `/finance/transactions` | Create |
| GET | `/finance/transactions` | List — `?category=`, `?from=`, `?to=` (RFC3339 or `YYYY-MM-DD`) |
| PUT | `/finance/transactions/:id` | Update |
| DELETE | `/finance/transactions/:id` | Delete |
| GET | `/finance/categories` | List — `?include_archived=true` to include archived |
| POST | `/finance/categories` | Create a custom category |
| PATCH | `/finance/categories/:id` | Edit icon/color, archive/unarchive |
| GET | `/finance/budgets` | List for `?month=YYYY-MM` (default: current month) |
| POST | `/finance/budgets` | Create |
| PATCH | `/finance/budgets/:id` | Update limit/rollover |
| GET | `/finance/reports/monthly` | Income/expenses/savings rate for `?month=` |
| GET | `/finance/reports/categories` | Spending breakdown by category for `?month=` |
| GET | `/finance/reports/trend` | Last 6 months of expenses, anchored at `?month=` |
| GET | `/finance/reports/vehicle-cost` | Total vehicle-sourced spend for `?month=` |
| GET | `/finance/reports/vehicle-breakdown` | Vehicle-sourced spend for `?month=`, split by fuel/maintenance/other |
| GET | `/healthz` | Liveness check |

## RabbitMQ

Consumes `vehicle.expense.created` (auto-creates a "Transport" transaction, tagged
`source = "vehicle:<id>:<subtype>"` so the vehicle-breakdown report can group by subtype).
Publishes `finance.transaction.added` and `finance.budget.exceeded`. Publishing goes through
`rabbitmq.ReconnectingChannel` (`infra/rabbitmq/go/reconnecting_publisher.go`) rather than a raw
channel — CloudAMQP's free tier can silently drop an idle connection, and this transparently
redials and retries once before giving up, instead of failing every publish until the process
restarts. The consumer (`RunConsumerWithReconnect`) reconnects the same way if its connection dies.
Optional for local dev: without `RABBITMQ_URL` set, the service runs fine, it just doesn't
publish/consume events (no vehicle-expense auto-import, no budget-alert events).

## Run locally

1. Postgres: install natively. Create the `finance` database once: `createdb -U postgres finance`.
2. Copy `.env.example` to `.env`, set `DATABASE_URL` to match your local Postgres password.
3. Run the service (`.env` is loaded automatically):

   ```bash
   go run .
   ```

## Try it

```bash
curl -X POST localhost:8081/finance/transactions \
  -H "Content-Type: application/json" -H "X-User-Id: test-user" \
  -d '{"amount": -1500, "category": "Food", "note": "Lunch"}'

curl localhost:8081/finance/transactions -H "X-User-Id: test-user"
```
