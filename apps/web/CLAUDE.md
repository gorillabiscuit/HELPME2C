# apps/web — package-specific CLAUDE.md

Inherits everything from the root `CLAUDE.md`. This file holds rules that apply ONLY to the web app.

> **Stub.** Fill in as Phase 2 (repo bootstrap) progresses. The skeleton below is what we expect to need; the new session refines it as the actual code shape emerges.

---

## What this is

Next.js 15+ (App Router), React 19, TypeScript strict. Deployed on Vercel. Consumes the tRPC API exposed at `/api/trpc/*` (which lives in this same Next.js app — no separate backend service in MVP).

## Imports allowed

- From `packages/shared` — types, Zod schemas, hooks, utils
- From `packages/ui` — React components designed for web
- From `packages/ml` — recommendation engine module (consumed via tRPC routers, NOT directly in client components)
- Standard Node / Next.js / React libraries

## Imports forbidden

- From `apps/api` (doesn't exist as separate service yet; if it does later, no app-to-app imports)
- From `apps/mobile` (no cross-app imports ever)
- From `packages/mobile-ui` (web ≠ React Native; never share UI components across platforms)
- React Native libraries (`react-native`, `expo-*`, etc) — wrong platform

## Web-specific banned patterns (in addition to root §3)

- **No client-side fetching to TMDB / AniList / external APIs** — all external calls go through tRPC (server-side) so we control caching, rate limiting, and credentials. Browser making a direct API call to a third-party = ADR-required exception.
- **No `localStorage` / `sessionStorage` for sensitive data.** Auth tokens are managed by the auth provider; user preferences sync to the server.
- **No runtime CSS-in-JS** (styled-components, Emotion) per [ADR-0014](../../docs/decisions/0014-styling-approach-web.md). The single carve-out is `@mui/x-data-grid` (per [ADR-0016](../../docs/decisions/0016-component-library.md)) which brings Emotion as a transitive dep — only allowed in screens that genuinely need a serious data table. No other `@mui/*` packages.
- **No `@vercel/*` imports** (KV, Blob, Edge Config, Analytics, Speed Insights, etc) per [ADR-0017](../../docs/decisions/0017-hosting-platform.md)'s lock-in firewall. Use vendor-neutral alternatives (Postgres, S3-compatible, Plausible/PostHog) only. Standard `next/image` is fine; `@vercel/*` packages are not.
- **No Vercel Edge Runtime** — Node.js runtime only per [ADR-0015](../../docs/decisions/0015-api-deployment-shape.md) and [ADR-0017](../../docs/decisions/0017-hosting-platform.md). The `pg` driver, Inngest SDK, and `packages/ml` all expect Node APIs.

## Server Components vs Client Components

- **Server Components by default.** Title pages, recommendation lists, group views, user profile — all RSC.
- **Client Components only where interactivity demands.** Forms, modals, anything with `useState` / `useEffect`.
- **Mark Client Components with `"use client"`** at the top of the file. Make this an explicit, intentional choice.

## Routing

- App Router (`app/` directory), not Pages Router.
- Route groups for layouts (`(marketing)`, `(authed)`).
- Loading and error boundaries per route segment.

---

_Refine this file as Phase 2 progresses. When in doubt, default to root `CLAUDE.md` rules._
