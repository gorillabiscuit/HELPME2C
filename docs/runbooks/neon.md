# Runbook: Neon

**What it is:** managed Postgres. Per [ADR-0005](../decisions/0005-database-postgres-host.md).
Connection via `@neondatabase/serverless` HTTP driver per [ADR-0019](../decisions/0019-orm.md).

## What breaks if it's down

- Every server-rendered page that reads user data (the dashboard, anything
  per-user) — they 5xx via tRPC.
- The `/api/webhook/clerk` handler — Clerk retries the webhook with backoff,
  so user-row syncs lag rather than disappear.
- The TMDB Inngest sync function — `step.run` operations fail; Inngest
  retries with backoff per the function's `retries: 3` config. After
  retries exhaust, the function fails and is visible in Inngest's dashboard.
- Marketing page (`/` for signed-out users): unaffected — it does no DB
  reads.

## Manual fallback

There isn't one for read-heavy paths. The HTTP driver doesn't fail-over
gracefully; we'd need a multi-region replica + driver switch, deferred
post-launch.

For brief outages: rely on Vercel's static asset caching for non-DB pages.
Sign-in and personalised flows will simply error.

## Status page

https://neonstatus.com/

## How we tell it's Neon and not us

- `connect ETIMEDOUT` or `fetch failed` errors in Sentry from the
  `@neondatabase/serverless` driver → driver-side or Neon-side.
- Schema-level errors (`column "x" does not exist`, `null value in column "y"`)
  → our migration / code.
- Status page shows an incident in our region (EU Frankfurt, `eu-central-1`).
- A direct `psql` connection to the unpooled URL fails → Neon-side.

## Cost signals

- Free plan: 1 project, 0.5 GB storage, 191.9 hours of compute time/mo,
  100 hours active per branch/mo. EU region included.
- Watch: compute hours and storage in the Neon dashboard. The cron-driven
  TMDB sync is bursty — a full nightly fan-out (100 pages, ~2000 shows ×
  per-row writes) consumes meaningful compute.
- The 5x storage growth from `streaming_availability` (currently 141k
  rows; will scale ~linearly with title count + countries) is the biggest
  long-term storage cost driver. Consider per-region cold archival at
  ~10x current size.
- Hard budget alerts: not yet wired up.

## Key rotation

If `DATABASE_URL` or `DATABASE_URL_UNPOOLED` leaks:

1. Neon Console → project → "Roles" → reset password on the `neondb_owner`
   role (or whichever role the URL embeds).
2. Update both URLs in Vercel project env vars (Production + Preview).
3. Update local `apps/web/.env.local`.
4. Redeploy via `pnpm dlx vercel --prod`.

The unpooled URL is used by `drizzle-kit migrate` (per `apps/web/drizzle.config.ts`);
the pooled URL by the runtime. Rotate both at the same time.

## Migrations

- `pnpm db:generate` creates a migration from the Drizzle schema diff.
- `pnpm db:migrate` applies pending migrations via `node-postgres` (`pg`).
  Hangs on the WS-based Neon serverless driver in the drizzle-kit subprocess
  — `pg` is the supported migration driver as of 2026-05-07.
- `pnpm db:push` is the dev-only "push schema directly" path. Don't use in
  production — it bypasses migration history.

For schema changes touching populated tables: create a Neon branch as a
sandbox, run the migration there first, then on main. Branch creation
is free and fast (Neon Console → Branches → "Create branch").

## Reference docs

- [Neon docs](https://neon.tech/docs/introduction)
- [Drizzle + Neon](https://orm.drizzle.team/docs/get-started-postgresql#neon)
- [ADR-0005](../decisions/0005-database-postgres-host.md), [ADR-0019](../decisions/0019-orm.md)
