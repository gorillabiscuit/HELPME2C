# ADR-0004: Auth provider

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

We chose Clerk as the authentication provider for HelpME2C.

## What we rejected

- **NextAuth.js (Auth.js v5)** — lower cost and no vendor lock-in, but requires more configuration and does not provide the same hosted UI / session management experience out of the box.
- **Supabase Auth** — attractive only if we commit to Supabase for Postgres and want a single provider; not ideal if we choose a separate DB or Clerk for auth.
- **Auth0** — enterprise-focused, expensive, and more complex than needed for our MVP.
- **Roll-your-own JWT auth** — explicitly banned by `CLAUDE.md` and a poor fit for solo-dev speed and safety.

## Why

HelpME2C needs an auth provider that is fast to implement, supports email/password plus Google OAuth, and handles session management, email verification, password reset, and account deletion securely. Clerk provides these features with hosted UIs, a developer dashboard, and built-in flows that reduce implementation risk.

For a solo dev shipping Phase 1A, those savings are valuable. Clerk also makes it easier to add Phase 1B features like MFA later, while still allowing our backend to remain a clean, modular service. If we choose Supabase for Postgres later, we can still use Clerk independently and avoid coupling auth to the database provider.

## What would change our mind

- Budget constraints make a paid auth provider untenable for MVP.
- We decide to use Supabase as the database provider and want the simplest integrated auth path.
- We need a fully self-hosted identity solution for compliance or data-residency reasons.

## Related

- ADR-0000 (depends on / influences)
- ADR-0005 (DB provider interacts with auth choice)
- PROJECT.md §Phase 1A scope
- CLAUDE.md §4 (stop-and-ask for new dependencies / auth changes)
