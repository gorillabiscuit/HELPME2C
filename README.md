# HelpME2C

Cross-medium TV + anime recommendation engine, built around two differentiators: group recommendations (find what 2+ people will both enjoy) and theme-based cross-medium taste bridging.

> **Pre-bootstrap state.** This repo currently contains design / contract scaffolding only — no `package.json`, no application code yet. Phase 1 (stack-selection ADRs) and Phase 2 (repo bootstrap) need to happen before this README's commands work.

## Read first

Before doing anything, read in order:

1. **`KICKOFF.md`** — what state this project is in and what the first session should do
2. **`PROJECT.md`** — what we're building (Phase 1A scope, target users, revenue model)
3. **`CLAUDE.md`** — working contract (read end to end; this is the rules of engagement)
4. **`docs/decisions/0000-architecture-overview.md`** — macro architecture
5. **`docs/decisions/QUEUE.md`** — pending stack-selection decisions

## Eventual setup (after Phase 2 bootstrap)

```bash
# Install everything (also runs husky install via prepare script)
pnpm install

# Develop
pnpm dev                              # all apps
pnpm dev --filter=@helpme2c/web       # just web

# Quality gates
pnpm preflight                        # typecheck + lint + test
pnpm test:e2e                         # Playwright

# Pre-push gates run automatically via .husky/pre-push
# (AI-attribution scan; aborts the push if any commit has a forbidden trailer)
```

## Repo layout (designed; not yet implemented)

```
apps/
  web/        Next.js 15 + React 19 + TypeScript strict (Phase 1A)
  api/        Stub for now; potentially split out in Phase 2
  mobile/     Expo / React Native (Phase 2; stub now)
packages/
  shared/     Cross-platform code (types, schemas, hooks, utils)
  ui/         React components for web
  mobile-ui/  React Native components (Phase 2)
  ml/         Recommendation engine module (the prospective product moat)
  content/    Ingestion + sync from TMDB / AniList (Phase 1A)
docs/
  decisions/  ADRs (Architecture Decision Records)
scripts/      Project scripts (gates, hooks)
.claude/
  commands/   Claude Code slash commands (e.g. /pre-pr)
```

## License

TBD before public launch. Don't open-source any code yet — this is a product, not a template.

## Contributing

Solo project for now. If that changes, contributing rules go here. Until then: read `CLAUDE.md`.
