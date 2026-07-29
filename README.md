# Expense Tracker

Monorepo for the Expense Tracker application.

## Structure

```text
expense-tracker/
  frontend/   Node/Vite frontend
  backend/    Spring Boot backend
  scripts/    Release and utility scripts
```

## Release Flow

The versioned image script pulls the latest source, shows existing image
versions, prompts for a new version, and builds the complete application.
The Dockerfile builds both the React frontend and Spring Boot backend. After a
successful build, the script keeps the new image and the newest previous
version for rollback, then removes older image tags that are not in use.

Run:

```bash
bash scripts/build-image.sh
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
