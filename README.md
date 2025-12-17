# PayFlow – Payment Orchestration System

PayFlow is a payment orchestration project

## How to Run

Requirements:

- Docker
- Docker Compose

## Demo Flow (Recommended)

1. Start system:
   ```bash 
   cd payflow
   ```
   ```bash
   docker compose up --build
   ```
   This starts:
   •PostgreSQL
   •Redis
   •PayFlow API (Spring Boot)
   •Admin UI (React)

2. Open Admin UI:
   http://localhost:3000
   (admin / admin123)
   ```bash
   admin / admin123
   ```   

3. Generate demo data (optional but recommended):
   docker run --rm -i \
   -e BASE_URL=http://host.docker.internal:8080 \
   -v "$PWD/payflow-api/k6:/scripts" \
   grafana/k6 run /scripts/k6-load.js

4. Observe:
    - Payments list (pagination, filters)
    - Routing decisions (View button)
    - Metrics page (successRate, p95 latency)
    - Providers page (simulate failover)

API: http://localhost:8080/swagger-ui.html
Admin UI: http://localhost:3000

## Stop / Clean

```bash
docker compose down -v
```

## Project Structure

	•payflow-api/ → Spring Boot backend
	•admin-ui/ → React admin dashboard
	•docker-compose.yml → Full system setup

For backend technical details see:
payflow-api/README.md