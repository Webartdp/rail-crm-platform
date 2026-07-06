# Local Development

## Required tools

- PHP 8.3+
- Composer
- Node.js LTS
- Docker

## Docker services

The project uses Docker services for PostgreSQL and Redis.

Start:

```bash
docker compose up -d
```

Stop:

```bash
docker compose down
```

## Backend

Backend location:

```text
backend/
```

Backend will contain the Laravel API.

## Frontend

Frontend location:

```text
frontend/
```

Frontend will contain the Next.js web interface.

## Rule

Local configuration must stay in `.env` files. Only safe examples should be committed.
