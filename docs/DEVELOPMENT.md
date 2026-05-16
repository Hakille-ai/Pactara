# Development Guide

This guide covers local setup, common commands, and verification checks for contributors.

## Prerequisites

- Docker and Docker Compose for the full local stack.
- Rust 1.88+ for local backend development.
- Node.js 22+ for the Next.js dashboard.

Docker is the shortest path because it starts PostgreSQL, runs migrations through API startup, and serves the dashboard.

## Environment

Create a local environment file:

```bash
cp .env.example .env
```

Important variables:

- `DATABASE_URL`: PostgreSQL connection string used by the Rust API.
- `PACTARA_API_HOST`: bind host for the API.
- `PACTARA_API_PORT`: bind port for the API.
- `PACTARA_AUTH_REQUIRED`: set to `true` to require auth on protected mutations.
- `NEXT_PUBLIC_PACTARA_API_URL`: API base URL used by the web dashboard.

## Full Stack

```bash
docker compose up --build
```

Services:

- API: `http://localhost:8080`
- Mission Control dashboard: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

Health checks:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

## Backend

Run all Rust tests:

```bash
cargo test --workspace
```

Run a single crate:

```bash
cargo test -p pactara-api
```

Start the API locally with an existing PostgreSQL database:

```bash
DATABASE_URL=postgres://pactara:pactara@localhost:5432/pactara \
PACTARA_API_HOST=0.0.0.0 \
PACTARA_API_PORT=8080 \
cargo run -p pactara-api
```

The API applies SQLx migrations automatically during startup.

## Web Dashboard

```bash
cd apps/web
npm install
npm run dev
```

By default, Next.js serves on `http://localhost:3000`. In Docker Compose, the dashboard is exposed on `http://localhost:3001`.

Build check:

```bash
cd apps/web
npm run build
```

## Database

Migrations live in `migrations/` and are applied in lexical order. New migrations should use a zero-padded prefix:

```text
0005_short_description.sql
```

Runtime history should favor append-only audit and event tables. When a feature creates operational state, consider whether it should also appear in:

- `GET /v1/ops/overview`
- `GET /v1/runtime/timeline`
- `GET /v1/audit/events`
- `GET /v1/events`
- `GET /v1/notifications`

## Pre-PR Checks

Run:

```bash
cargo test --workspace
cd apps/web
npm run build
```

Also smoke-test Docker Compose when runtime behavior changes:

```bash
docker compose up --build
```
