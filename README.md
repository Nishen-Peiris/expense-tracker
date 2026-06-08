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

The packaged deployment artifact is produced from both applications:

1. Build the frontend
2. Copy the frontend build output into the backend static resources
3. Package the Spring Boot application
4. Copy the final JAR into the deployment directory

Run:

```bash
bash scripts/build-release.sh
```

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
