# Vehicle Service

Go + Gin · owner: Member 2 · port 8082

Vehicle profiles, fuel log, maintenance log, other expenses, reminders, and cost/efficiency
analytics. Publishes `vehicle.expense.created` (fuel, maintenance, and other expenses all count)
and `vehicle.reminder.due` — consumed by Finance Service and Notification Service respectively.

## Endpoints

All routes read the caller's identity from the `X-User-Id` header, set by the API Gateway after
JWT validation — this service does not verify tokens itself.

| Method | Path | Notes |
|---|---|---|
| POST | `/vehicle/vehicles` | Create |
| GET | `/vehicle/vehicles` | List |
| GET | `/vehicle/vehicles/:id` | Get one |
| PUT | `/vehicle/vehicles/:id` | Update |
| DELETE | `/vehicle/vehicles/:id` | Delete |
| POST | `/vehicle/vehicles/:id/primary` | Set as primary vehicle |
| POST | `/vehicle/vehicles/:id/fuel` | Log a fuel fill-up — publishes `vehicle.expense.created` |
| GET | `/vehicle/vehicles/:id/fuel` | List fuel logs |
| DELETE | `/vehicle/fuel/:id` | Delete a fuel log |
| POST | `/vehicle/vehicles/:id/maintenance` | Log a service — publishes `vehicle.expense.created` |
| GET | `/vehicle/vehicles/:id/maintenance` | List maintenance logs |
| DELETE | `/vehicle/maintenance/:id` | Delete a maintenance log |
| POST | `/vehicle/vehicles/:id/expenses` | Log another expense (insurance, fines, etc.) — publishes `vehicle.expense.created` |
| GET | `/vehicle/vehicles/:id/expenses` | List other expenses |
| DELETE | `/vehicle/expenses/:id` | Delete an expense |
| POST | `/vehicle/vehicles/:id/reminders` | Create a reminder |
| GET | `/vehicle/vehicles/:id/reminders` | List reminders |
| PUT | `/vehicle/reminders/:id` | Update a reminder |
| DELETE | `/vehicle/reminders/:id` | Delete a reminder |
| GET | `/vehicle/vehicles/:id/analytics/cost-of-ownership` | Total cost of ownership |
| GET | `/vehicle/vehicles/:id/analytics/monthly-breakdown` | Fuel vs maintenance vs other, by month |
| GET | `/vehicle/vehicles/:id/analytics/efficiency-trend` | Fuel efficiency over time |
| GET | `/vehicle/analytics/compare` | Compare cost across the caller's vehicles |
| GET | `/healthz` | Liveness check |

A background reminder scanner runs hourly, publishing `vehicle.reminder.due` for any reminder
that's entered its notify window (and marking it notified so it doesn't refire).

## RabbitMQ

Declares the shared exchange and binds `finance-service.vehicle-expense-created` and
`notification-service.vehicle-reminder-due` on boot (via the `spendwise/rabbitmq` package, see
`infra/rabbitmq/README.md`) — this is why those two queues exist even before Finance/Notification
Service ever start. Optional for local dev: without `RABBITMQ_URL` set, the service runs fine,
it just doesn't publish events.

## Run locally

1. Postgres: install natively. Create the `vehicle` database once: `createdb -U postgres vehicle`.
2. Copy `.env.example` to `.env` and adjust `DATABASE_URL` if your local Postgres password differs.
3. Run the service (`.env` is loaded automatically):

   ```bash
   go mod tidy
   go run .
   ```

## Try it

```bash
curl localhost:8082/healthz

curl -X POST localhost:8082/vehicle/vehicles \
  -H "Content-Type: application/json" -H "X-User-Id: test-user" \
  -d '{"make":"Toyota","model":"Aqua","year":2019,"plate_number":"CAR-1234","fuel_type":"Petrol"}'
```
