# SpendWise

Personal finance tracker with a dedicated vehicle management module. Polyglot microservices backend, Expo/React Native mobile app.

## Structure

```
spendwise/
├── mobile/                    # React Native / Expo app (see mobile/README.md)
├── services/
│   ├── auth-service/          # Go — shared JWT auth
│   ├── finance-service/       # Spring Boot — transactions, categories, budgets
│   ├── vehicle-service/       # Go + Gin — vehicles, fuel log, maintenance
│   └── notification-service/  # FastAPI — reminders, push, AI insights
├── infra/
│   ├── kong/                  # API gateway config (added once services are stable)
│   └── rabbitmq/              # Message broker config (added once services are stable)
└── docker-compose.yml         # Local dev: Postgres per service + Redis
```

## Status

- **Mobile**: UI-complete, not yet wired to a backend.
- **Backend**: scaffolding in progress. Each service currently runs standalone against its own Postgres instance via Docker Compose — no API gateway or message broker yet. Kong and RabbitMQ are added once each service has a working core (see the service READMEs and each service's owner for status).

## Local development

```bash
docker-compose up
```

Then run each service per its own `README.md`, and the mobile app via:

```bash
cd mobile
npm install
npx expo start
```
