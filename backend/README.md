# Expense Tracker Backend

## Run locally

1. Copy `.env.example` to `.env`
2. Fill in your existing MySQL server details
3. Set `OPENAI_API_KEY` in `.env`
4. Build and start the backend:

```bash
docker compose up -d --build
```

The backend exposes port `8080` by default.

Default LLM settings:

- `LLM_BASE_URL=https://api.openai.com/v1`
- `LLM_MODEL=gpt-5.4-nano`
- `OPENAI_API_KEY=<your OpenAI API key>`

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
2. Export `OPENAI_API_KEY`
3. Export `LLM_BASE_URL` if you are not using `https://api.openai.com/v1`
4. Export `LLM_MODEL` if you want a model other than `gpt-5.4-nano`
5. Start Spring Boot:

```bash
mvn spring-boot:run
```

## APIs

GET /api/transactions?from=2026-05-25&to=2026-06-24

POST /api/transactions

DELETE /api/transactions/{id}
