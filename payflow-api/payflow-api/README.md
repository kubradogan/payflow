# PayFlow
This project shows a small payment API built with Spring Boot, Postgres, and Redis.
The goal is to demonstrate idempotent payment handling, provider routing, failover logic, and basic operational metrics.

# Running the Backend
# 1. Start the local infrastructure:
`docker compose up -d`

(Postgres runs on 5434, Redis on 6380.)

# 2. Start the application from your IDE:
`PayflowApiApplication`

# The API will be available at:
http://localhost:8080

# Running the Admin UI
`cd admin-ui`
`npm install`
`npm start`

# The UI runs on:
http://localhost:3000

# Main Features
* Idempotent payment processing (Redis key-based lock + DB constraint)
* Dynamic provider routing with health checks and latency/success scoring
* Failover when the primary provider fails
* Fault injection (failure rate, artificial latency, forced timeout)
* Metrics endpoint exposing p95 latency, success rate, failover count
* Basic Auth–protected admin panel
* k6 load test script for stress testing

# Endpoints
* POST /payments – create a payment
* GET /payments/{id} – fetch payment status
* GET /admin/providers – provider health
* POST /admin/providers/{name}/up|down
* POST /admin/mockpsp/config – fault injection
* GET /admin/metrics – aggregated metrics
* GET /admin/payments – recent payments

# Default Admin Credentials
`Username: admin`
`Password: admin123`