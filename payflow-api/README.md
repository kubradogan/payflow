# PayFlow

Small payment API built with **Spring Boot + PostgreSQL + Redis**.

Shows:

Idempotent payment handling (Redis + DB unique key)
Multi-provider routing (Stripe stub + Mock PSP)
Health-aware routing + automatic failover
Resilience4j circuit breakers
Fault injection for Mock PSP
Basic metrics + admin UI
HMAC-signed webhook example
k6 load test with p95/error thresholds

## Run Backend

## 1) Start infra:

`docker compose up -d`

(Postgres @ 5434, Redis @ 6380)

## 2. Start app:

`./gradlew bootRun`

API: http://localhost:8080

## Run Admin UI

`cd admin-ui`
`npm install`
`npm start`

UI: http://localhost:3000 (Basic Auth protected)

## Main Endpoints

Public

• POST /payments – create payment (idempotent by idempotencyKey)
• GET /payments/{id} – get payment status
• POST /webhooks/stripe – HMAC-SHA256 signed webhook (X-Signature)

Admin (Basic Auth)

• GET /admin/payments – paged list + search
• GET /admin/payments/{id}/decisions – routing history
• GET /admin/providers – provider health (UP/DOWN)
• POST /admin/providers/{name}/{status} – mark UP/DOWN
• POST /admin/mockpsp/config – set failureRate / latency / timeout
• GET /admin/metrics – successRate, p95 latency, failoverCount, errorDistribution

## Load & Tests
k6 script: `k6-load.js`

`k6 run k6-load.js`

# or

`BASE_URL=http://localhost:8080 k6 run k6-load.js`

## Thresholds:
• http_req_duration p(95) < 200 ms
• http_req_failed rate < 5%
• Unit/integration tests:

`./gradlew test`

PaymentServiceContainersTest uses Testcontainers (Postgres + Redis) and is @Disabled by default.

## Default Admin Credentials
`admin / admin123`