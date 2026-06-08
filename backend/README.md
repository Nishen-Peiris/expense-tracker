# Expense Tracker Backend

## Run locally

1. Copy `.env.example` to `.env`
2. Fill in your existing MySQL server details
3. Build and start the backend and Ollama:

```bash
docker compose up -d --build
```

The backend exposes port `8080` by default. Ollama is exposed on port `11434`.

Default Ollama settings:

- `OLLAMA_BASE_URL=http://localhost:11434/v1`
- `OLLAMA_MODEL=llama3.1:8b`

## CasaOS

Use the included `docker-compose.yml` as a custom compose app in CasaOS.

Required environment values:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USERNAME`
- `DB_PASSWORD`

If your MySQL server is on another machine or NAS, set `DB_HOST` to that hostname or IP.

## Run without Docker

1. Export the same database environment variables from `.env`
2. Start Ollama separately and make sure the configured model is pulled
3. Export `OLLAMA_BASE_URL` if Ollama is not running on `http://localhost:11434/v1`
4. Start Spring Boot:

```bash
mvn spring-boot:run
```

## APIs

GET /api/transactions?from=2026-05-25&to=2026-06-24

POST /api/transactions

DELETE /api/transactions/{id}
