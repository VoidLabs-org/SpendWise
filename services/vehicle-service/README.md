# Vehicle Service

Go + Gin · owner: Member 2 · port 8082

Skeleton only so far — Postgres connectivity and a health check. Vehicle/FuelLog/MaintenanceLog/
VehicleExpense CRUD and fuel-efficiency calculations come next (see the root plan).

## Run locally

1. Postgres: install natively (this project doesn't run it in Docker — see repo root README).
   Create the `vehicle` database once: `createdb -U postgres vehicle`.

2. Copy `.env.example` to `.env` and adjust `DATABASE_URL` if your local Postgres password differs.

3. Run the service (`.env` is loaded automatically):

   ```bash
   go mod tidy
   go run .
   ```

## Try it

```bash
curl localhost:8082/healthz
```
