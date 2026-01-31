# Daily Standup + Performance Tracker

Lightweight Next.js app for outbound SDR standups and performance tracking.

## Stack
- Next.js (App Router) + TypeScript
- Prisma + SQLite
- Tailwind CSS
- Simple auth-lite (select name + manager PIN)

## Local Setup
1) Install dependencies
```bash
npm install
```

2) Set env vars
```bash
cp .env.example .env
```
Edit `.env` to set your manager PIN.

3) Initialize the database + seed sample reps
```bash
npx prisma migrate dev --name init
npm run seed
```

4) Run the app
```bash
npm run dev
```

Open `http://localhost:3000`.

## Usage
- **SDRs**: pick your name on the home page to open your standup.
- **Manager**: enter the PIN on the home page or `/manager`.
- **Standup flow**: goals saved for today; actuals saved for yesterday.

## Adding / Editing Reps
Option A (recommended): add names in `prisma/seed.ts`, then re-run `npm run seed`.

Option B: add users directly using Prisma Studio:
```bash
npx prisma studio
```

## Env Vars
- `DATABASE_URL` (default: `file:./dev.db`)
- `MANAGER_PIN` (required for manager access)
