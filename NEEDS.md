# Production Needs

What this tool requires to run in production.

## External services
- **Postgres database** (`DATABASE_URL`). The app uses Prisma against a single Postgres
  instance for all reads/writes (reps, standups, wins/blockers, manager settings).
  Neon on Vercel is the current setup, but any Postgres works.
  - Migrations: `prisma migrate deploy` (run during `npm run build`).
  - Schema: see [prisma/schema.prisma](prisma/schema.prisma).

## Credentials / config
- `DATABASE_URL` — Postgres connection string.
- `MANAGER_PIN` — bootstrap PIN. On first manager login it is hashed (SHA-256) and stored
  in the DB (`ManagerSettings`); after that, the PIN is managed in-app and `MANAGER_PIN`
  is only used to seed the first one.

## What it does NOT need
- No third-party APIs (no Rocketlane, Snowflake, internal admin API, etc.).
- No external auth provider — auth is a name-picker plus the manager PIN.
- No outbound network calls beyond the Postgres connection.
