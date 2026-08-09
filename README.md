# Spending Tracker

Personal finance tracker across multiple accounts (bank, credit card, cash, savings,
investment). See [spec.md](./spec.md) for the full product spec and the build plan at
`C:\Users\jsphe\.claude\plans\quizzical-roaming-boole.md` for the phased implementation
approach.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth) · Prisma 7
(driver-adapter pattern) · Recharts

## Setup

1. Copy `.env.example` to `.env` and fill in your Supabase project's values (Project
   Settings → Data API for the URL/anon key, Project Settings → Database → Connection
   string for `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (direct, port 5432)).
2. `npm install`
3. `npx prisma migrate dev --url "$DIRECT_URL"` — applies migrations bypassing the
   pgbouncer pooler (Prisma 7 has no `directUrl` config field; the pooled `DATABASE_URL`
   in `prisma.config.ts` is used for runtime queries only, see the comment there).
4. `npm run dev`

## Notes

- `src/proxy.ts` (not `middleware.ts` — renamed in Next.js 16) refreshes the Supabase
  session and gates the `(app)` route group.
- Prisma connects directly to Postgres and bypasses Supabase Row Level Security, so every
  Server Action must independently verify the session user — never rely on RLS alone for
  this app's data access path.
- The Claude-powered smart entry/Q&A feature (spec §5.7) is deferred; `ClaudeFabPlaceholder`
  marks where it will be wired in.
