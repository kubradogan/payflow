# PayFlow – Payment Orchestration System

PayFlow is a payment orchestration project

It demonstrates:
- Idempotent payment processing
- Multi-provider routing with failover
- Resilience patterns (Circuit Breaker)
- Observability via admin dashboard
- Load testing and fault simulation

## How to Run

Requirements:
- Docker
- Docker Compose

### Start the full system

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

## Stop / Clean
```bash
docker compose down -v
```

API: http://localhost:8080/swagger-ui.html
Admin UI: http://localhost:3000

## Default admin credentials:

```bash
admin / admin123
```

##  Load Test (k6)

Load testing is optional and not executed automatically.
```bash
k6 run payflow-api/k6-load.js
```

##  Project Structure
	•payflow-api/ → Spring Boot backend
	•admin-ui/ → React admin dashboard
	•docker-compose.yml → Full system setup

For backend technical details see:
payflow-api/README.md