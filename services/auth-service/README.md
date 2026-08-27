# Auth Service

Go · shared auth (owner: whole team) · port 8080

Email/password authentication with JWT access tokens and Redis-backed rotating refresh tokens. Google OAuth is not implemented yet (MVP scope).

## Endpoints

| Method | Path             | Body                                 | Notes                                      |
|--------|------------------|---------------------------------------|---------------------------------------------|
| POST   | `/auth/register` | `{email, password, name}`             | Creates a user, returns a token pair        |
| POST   | `/auth/login`    | `{email, password}`                   | Returns a token pair                        |
| POST   | `/auth/refresh`  | `{refresh_token}`                     | Rotates the refresh token, returns a new pair |
| POST   | `/auth/logout`   | `{refresh_token}` (optional) + `Authorization: Bearer <access_token>` | Revokes the refresh token and blacklists the access token |
| GET    | `/auth/validate` | `Authorization: Bearer <access_token>` | Returns `{user_id, email}` if valid — called by the API Gateway on every protected request |
| GET    | `/healthz`       | —                                      | Liveness check                              |

Access tokens are HS256 JWTs, 15 min TTL. Refresh tokens are opaque random tokens stored hashed (SHA-256) in Redis with a 30-day TTL, and are single-use — each `/auth/refresh` call deletes the old one and issues a new one (rotation).

## Run locally

1. Postgres: install natively (this project doesn't run it in Docker — see repo root README). Create the `auth` database once: `createdb -U postgres auth`.

2. Redis: run via Docker Compose from the repo root:

   ```bash
   docker-compose up -d redis
   ```

3. Copy `.env.example` to `.env` and set `DATABASE_URL` to match your local Postgres password.

4. Run the service (`.env` is loaded automatically):

   ```bash
   go run .
   ```

The service creates its `users` table on startup if it doesn't exist yet (see `internal/auth/store.go`'s `Migrate`).

## Try it

```bash
curl -X POST localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"password123","name":"Test User"}'

curl localhost:8080/auth/validate -H "Authorization: Bearer <access_token>"
```
