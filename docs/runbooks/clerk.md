# Runbook: Clerk

**What it is:** authentication provider. Hosted sign-in/sign-up UI, session
JWTs, user metadata, webhook event delivery. Per [ADR-0004](../decisions/0004-auth-provider.md).

## What breaks if it's down

- New sign-ups can't complete (Clerk's hosted UI is unreachable).
- Existing signed-in users on cached pages may continue browsing — JWTs
  are short-lived (~60s) but `clerkMiddleware` won't successfully refresh
  them, so as soon as a JWT expires those sessions deauth.
- The `/api/webhook/clerk` endpoint receives no events (Clerk can't fire
  them) — `me.ensure` fallback covers this.
- `currentUser()` calls in server components fail; tRPC `protectedProcedure`
  throws `UNAUTHORIZED` even for users with valid sessions, because Clerk's
  introspection endpoint is unreachable.
- Marketing page (`/` signed-out): unaffected — no Clerk reads.

## Manual fallback

There isn't one for sign-up. Clerk is the auth surface; without it, no new
accounts. For a short outage during a critical moment, this is "wait
it out + apologise."

For existing users mid-session: nothing actionable — Clerk's middleware is
in the request path. Once JWT expires they'll be redirected to sign-in,
which itself can't load.

## Status page

https://status.clerk.com/

## How we tell it's Clerk and not us

- Sentry errors with `@clerk/nextjs` in the stack → Clerk SDK or upstream.
- Webhook deliveries failing in Clerk Dashboard → Webhooks → Activity →
  could be us (5xx from `/api/webhook/clerk`) or them (delivery failures).
- The hosted sign-in/sign-up page itself failing to load → Clerk-side.
- Our middleware (`apps/web/src/proxy.ts`) returning 5xx → Clerk
  introspection failures, see Sentry.

## Dev vs production instances

We're on a **development** instance (host `set-stinkbug-16.clerk.accounts.dev`).
Dev instances:
- Show a development banner in the hosted UI.
- Use `pk_test_…` / `sk_test_…` keys.
- Have looser rate limits and shorter session lifetimes.
- Are not suitable for non-friend-tester production use.

Switching to a production instance is a planned task before alpha launch
(M10) — requires DNS for an `accounts.<our-domain>` subdomain, new keys,
and a redeploy. Not urgent until alpha testers see auth.

## Cost signals

- Free plan: 10,000 monthly active users (MAU), unlimited social
  connections in dev, 10 social connections in prod.
- Watch: MAU on Clerk Dashboard → Overview. The default consideration is
  10k MAU as the free → paid threshold ($25/mo + per-MAU after).
- Webhook deliveries: not separately metered AFAIK.
- Hard budget alerts: not yet wired up.

## Key rotation

`CLERK_SECRET_KEY` (server-side):

1. Clerk Dashboard → Configure → API Keys → "Roll secret key."
2. Update in Vercel env vars.
3. Update in local `apps/web/.env.local`.
4. Redeploy.

`CLERK_WEBHOOK_SECRET`:

1. Clerk Dashboard → Webhooks → endpoint → ⋮ menu → "Roll signing secret."
2. Update env vars + redeploy.

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: not strictly secret (designed for
client embedding), but rotate by recreating the dev instance if needed —
not a Phase 1A concern.

## Webhooks

Single endpoint: `POST /api/webhook/clerk`. Verifies via svix.
Subscribed events: `user.created`, `user.updated`. Handler upserts the
DB row and writes `publicMetadata.dbSynced: true` so the home page
short-circuits the `me.ensure` fallback.

If a webhook is failing in Clerk Dashboard → Webhooks → Activity:

- Click the failed message → "View attempt" → response body.
  Common cases (logs identify exactly which):
  - 401: signing secret mismatch (probably out of sync between Clerk + env)
  - 404 from a sub-call (Clerk API): likely a synthetic test event with a
    fake user ID; safe to ignore (handler already tolerates this).
  - 500: handler bug; see Sentry.
- Replay: ⋮ menu → Replay. Useful after fixing a transient bug.

## Reference docs

- [Clerk docs](https://clerk.com/docs)
- [Webhooks](https://clerk.com/docs/integrations/webhooks)
- [Customize session token](https://clerk.com/docs/backend-requests/making/custom-session-token)
- [ADR-0004](../decisions/0004-auth-provider.md)
