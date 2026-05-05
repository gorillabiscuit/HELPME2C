# ADR-0002: Frontend framework

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

We chose Next.js 15+ with the App Router, React 19, and strict TypeScript mode, deployed on Vercel.

## What we rejected

- **Remix / React Router 7** — strong for loaders/actions, but the Next.js ecosystem is more mature for the auth, analytics, and tRPC patterns we need.
- **Vite + React (no framework)** — minimal overhead, but it would require us to build routing, SSR-like behavior, and data-loading patterns ourselves.
- **Astro** — well suited for content-heavy sites, but not ideal for an interactive recommendation/tracker app with dynamic data and user sessions.
- **SvelteKit / Vue / Solid** — viable options, but the React + Next.js ecosystem gives us the best compatibility with our planned libraries and the future mobile code-sharing story.

## Why

A product like HelpME2C needs a UX that combines dynamic user state, authenticated pages, and fast data-driven content. Next.js provides this with an App Router architecture, server components for read-heavy pages, and strong integration with Vercel hosting. That makes it the best fit for Phase 1A's MVP goals and the frontend expectations in `PROJECT.md`.

Next.js is also the safest choice for the later path to a shared codebase with React Native in Phase 2, while still keeping the initial implementation simple and focused on web only. Strict TypeScript aligns with `CLAUDE.md §3` and avoids the risk of accidental `any` drifting into the codebase.

## What would change our mind

- A non-Vercel deployment requirement that makes another framework a better operational fit.
- A specific limitation in Next.js App Router that blocks a required interactive pattern.
- A deliberate decision to use a different frontend runtime for better native/mobile code sharing in Phase 2.

## Related

- ADR-0000 (depends on / influences)
- PROJECT.md §Phase 1A scope
- CLAUDE.md §1 (Repo structure)
