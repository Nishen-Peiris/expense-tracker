# Expense Tracker

Monorepo for the Expense Tracker application.

## Structure

```text
batch/
  frontend/   Node/Vite frontend
  backend/    Spring Boot backend
  scripts/    Release and utility scripts
```

## Release Flow

The shell script prepares the backend for container packaging:

1. Build the frontend
2. Copy the frontend build output into the backend static resources
3. Build the backend container or package from `backend/`

Run:

```bash
bash scripts/build-release.sh
```

The Dockerfile in `backend/` handles the backend packaging step.

## Applications

### Frontend

- Path: `frontend/`
- Tooling: Node.js + Vite

Common commands:

```bash
cd frontend
npm install
npm run dev
npm run build
```

### Backend

- Path: `backend/`
- Tooling: Java 21 + Spring Boot + Maven

Common commands:

```bash
cd backend
mvn spring-boot:run
mvn clean package
```

Backend API examples:

- `GET /api/transactions?from=2026-05-25&to=2026-06-24`
- `POST /api/transactions`
- `DELETE /api/transactions/{id}`
