# SpendWise

Personal finance tracker with a dedicated vehicle management module. Microservices backend
(mostly Go — see below), Expo/React Native mobile app.

## Structure

```
spendwise/
├── mobile/                    # React Native / Expo app (see mobile/README.md)
├── services/
│   ├── auth-service/          # Go — shared JWT auth
│   ├── api-gateway/           # Go — routes, JWT gate, rate limiting
│   ├── finance-service/       # Go + Gin — transactions, categories, budgets
│   ├── vehicle-service/       # Go + Gin — vehicles, fuel log, maintenance, analytics
│   └── notification-service/  # FastAPI — reminders, push, AI insights (not started)
├── infra/
│   └── rabbitmq/               # Shared event topology + reusable Go client (see its README)
└── docker-compose.yml          # Local dev: Redis only (Postgres is native, RabbitMQ is CloudAMQP)
```

## Status

- **Mobile**: wired to the real backend for auth, vehicles, transactions, budgets, and categories
  — not mock data. Settings screen (profile, currency, language, budget rollover, categories) is
  also live. Notification/AI features aren't built since Notification Service doesn't exist yet.
- **Auth Service**: done — register/login/refresh/logout/validate, JWT + Redis-backed rotating
  refresh tokens.
- **API Gateway**: done — routes `/auth`, `/finance`, `/vehicle`, `/notifications` by prefix,
  JWT-gates the latter three via Auth Service's `/auth/validate`, rate limiting, CORS.
- **Finance Service**: done — transactions, categories (with defaults), budgets (with rollover
  and 80%/100% threshold alerts), reports, and the vehicle-expense auto-import consumer.
- **Vehicle Service**: done — vehicle/fuel/maintenance/expense/reminder CRUD, cost/efficiency
  analytics, hourly reminder scanner, publishes to RabbitMQ.
- **RabbitMQ**: live on a shared CloudAMQP instance (not local Docker) — see `infra/rabbitmq/README.md`
  for the topology, the reusable Go client, and the reconnecting-publisher pattern Finance Service uses.
- **Notification + AI Service**: not started.

## Local development

```bash
docker-compose up   # just Redis, used by auth-service
```

Postgres runs natively (each service creates its own DB — see that service's README for the
`createdb` command) and RabbitMQ is a shared CloudAMQP instance (ask a teammate for the
`RABBITMQ_URL`, or create your own free instance — see `infra/rabbitmq/README.md`).

Run each backend service per its own `README.md` (`go run .` from its directory, after copying
`.env.example` to `.env`), and the mobile app via:

```bash
cd mobile
npm install
npx expo start
```

Mobile talks to `auth-service` directly and everything else through `api-gateway` — see
`mobile/src/constants/api.ts` for the URLs (Android emulator vs physical device vs web needs
different hosts, documented there).
