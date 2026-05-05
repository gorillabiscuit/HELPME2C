# apps/api — package-specific CLAUDE.md

> **Stub.** Phase 1A may not have a separate `apps/api` — tRPC routers live inside `apps/web` for MVP. This directory exists for the case where we extract the API as a separate process later (Phase 2+ if scale or deployment isolation requires).
>
> Until then: this file is a placeholder. The new session may delete it after Phase 1 if the decision is to keep API in `apps/web` indefinitely.

---

## When this becomes a real package

Trigger conditions:

- We extract API to a separate Node service (e.g., for independent scaling or to deploy on infrastructure other than Vercel)
- We add a public REST/GraphQL API for productizing `packages/ml` (PROJECT.md §revenue)

Either trigger means an ADR + this file gets fleshed out.

## Until then

- Don't put API code here. It lives in `apps/web/app/api/trpc/*` per Next.js conventions.
- Don't import from this directory; it has no exports.

---

_Reconsider this directory's existence at the start of Phase 2. If we're not extracting API to its own service, delete the directory and remove this stub._
