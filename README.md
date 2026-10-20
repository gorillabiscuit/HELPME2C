# HelpME2C

Cross-medium TV and anime recommendation engine. It helps two people find a show they both want to watch, using themes and character arcs rather than flat genre or popularity.

- **Live:** https://helpme2c.wouterschreuders.com (Phase 1A, web only, registered users)
- **Tracker:** Linear, team `HEL` (ADR-0030)

## Read first

1. **`PROJECT.md`**: what we're building, and the North Star every change has to trace to.
2. **`CLAUDE.md`**: the working contract (banned patterns, stop-and-ask list, commit rules, pre-PR review).
3. **`docs/decisions/0000-architecture-overview.md`**: system shape. The other ADRs sit next to it.
4. **`LEARNED.md`**: sharp edges that cost time once already.

## Setup

Needs Node 24 (`.nvmrc`) and pnpm 10 (`packageManager` in `package.json`).

```bash
pnpm install                                   # also wires the git hooks (husky)
cp apps/web/.env.example apps/web/.env.local   # then fill in the values
pnpm --filter=@helpme2c/web dev                # web app on http://localhost:3000
```

Background jobs (catalog sync, recommendation recompute) run on Inngest. Locally they need
`INNGEST_DEV=1` in `.env.local` and the Inngest dev server running; see `docs/runbooks/inngest.md`.

Database migrations (Drizzle, Neon Postgres):

```bash
pnpm --filter=@helpme2c/web db:generate   # write a migration from schema changes
pnpm --filter=@helpme2c/web db:migrate    # apply migrations to DATABASE_URL
```

## Checks

```bash
pnpm preflight     # typecheck + lint + all tests; the same check runs on every pull request
pnpm format        # Prettier
```

The pre-push hook runs an AI-attribution scan and `pnpm preflight`, and aborts the push if either fails.

## Deploy

Vercel, project root `apps/web`. Pushes to `main` deploy automatically, except commits that touch
nothing under `apps/web/` (see `LEARNED.md`). For an explicit deploy, run `pnpm dlx vercel --prod`
from the repo root, never from `apps/web/`.

## Layout

```
apps/
  web/          Next.js app; also hosts the tRPC API and the Inngest functions
  mobile/       Expo / React Native, Phase 2 (placeholder only)
packages/
  ml/           recommendation engine, a pure module with no framework coupling
  shared/       platform-agnostic types, schemas and utilities
  ui/           React components for web
  mobile-ui/    React Native components, Phase 2 (placeholder only)
docs/
  decisions/    ADRs
  runbooks/     one page per vendor: what breaks, how to recover
scripts/        project scripts (gates, hooks)
```

## License

None yet. This is a product, not a template; don't open-source any of it.
