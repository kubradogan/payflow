# PayFlow Admin UI

React-based admin console for the PayFlow payment orchestration backend.

The UI connects to the Spring Boot API and exposes a simple control plane over:

- `/admin/payments` + `/admin/payments/{id}/decisions`
- `/admin/providers`
- `/admin/mockpsp/config`
- `/admin/metrics`
- `/payments` (demo client to create new payments)

## Prerequisites

- Node.js (LTS is fine)
- Running PayFlow backend on `http://localhost:8080`

From the project root, you can start the local infrastructure and backend as:

```bash
docker compose up -d
./gradlew :payflow-api:bootRun
```

# Backend API: http://localhost:8080

## Running the Admin UI

```bash
cd admin-ui
npm install
npm start
```

# Admin UI: http://localhost:3000
CORS and Basic Auth are already configured on the backend side for local development.

# Authentication

The admin UI uses HTTP Basic Auth against the backend.

Default credentials:

```bash
Username: admin
Password: admin123
```

On successful login the UI stores a Base64-encoded token in localStorage and attaches it as Authorization: Basic … to all /admin/** requests.
If the backend returns 401, the UI automatically clears credentials and sends the user back to the login screen