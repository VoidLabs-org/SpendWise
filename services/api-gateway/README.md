# API Gateway

Go · port 8000

Single entry point for the mobile app. Routes by path prefix to the right backend service,
gates protected routes on a valid JWT (delegated to Auth Service's `/auth/validate`), applies
CORS headers, and rate-limits per client IP.

## Routes

| Prefix | Upstream env var | Auth required |
|---|---|---|
| `/auth/*` | `AUTH_SERVICE_URL` | No — these are the endpoints that issue/refresh tokens |
| `/finance/*` | `FINANCE_SERVICE_URL` | Yes |
| `/vehicle/*` | `VEHICLE_SERVICE_URL` | Yes |
| `/notifications/*` | `NOTIFICATION_SERVICE_URL` | Yes |
| `/healthz` | — | No — liveness check |

Paths are proxied through **unchanged**, no prefix stripping. Each service is expected to expose
its own routes already namespaced under its domain (e.g. Finance Service should serve
`/finance/transactions`, not just `/transactions`) — same convention Auth Service already follows
with `/auth/register`.

If an upstream env var is empty, that route always returns `503` regardless of auth — there's
nothing to route to yet. Once a teammate's service is up, set its URL and restart the gateway.

On a successful auth check, the gateway forwards the resolved identity downstream via
`X-User-Id` / `X-User-Email` headers, so individual services don't need to re-verify the JWT
themselves — they can trust these headers *as long as the network guarantees only the gateway can
reach them directly* (true for the Docker Compose / local setup; revisit if services are ever
exposed publicly on their own).

## Run locally

```bash
cp .env.example .env
# set FINANCE_SERVICE_URL / VEHICLE_SERVICE_URL / NOTIFICATION_SERVICE_URL as those services come online
go run .
```

## Try it

```bash
# through the gateway instead of hitting auth-service directly
curl -X POST localhost:8000/auth/login -H "Content-Type: application/json" -d '{"email":"a@b.com","password":"password123"}'

# protected route, no token
curl -i localhost:8000/finance/transactions   # 401 or 503 depending on whether it's configured
```
