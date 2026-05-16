# Runbook: DSAR (Data Subject Access Requests)

**What it is:** the operational procedure for handling GDPR/UK-GDPR data subject requests. Per [ADR-0012](../decisions/0012-privacy-compliance.md).

## What kinds of requests can come in

Under GDPR, a user can lawfully request:

- **Article 15 — Right of access.** *"What do you have about me?"* Auto-served by `/api/account/export` (JSON download).
- **Article 17 — Right to erasure.** *"Delete my data."* Auto-served by `/api/account/delete` (anonymises behavioural signals, hard-deletes identifying records within 30 days).
- **Article 20 — Right to data portability.** *"Give me my data in a portable format."* Same `/api/account/export` covers this — the JSON is structured, machine-readable, and includes everything the user supplied.
- **Article 16 — Right to rectification.** *"Fix incorrect data."* Manual — user emails us; we update the relevant row.
- **Article 21 — Right to object.** *"Stop processing me for purpose X."* Manual — user emails us; we update consent toggles + flag account.

The first three (~95% of expected volume per [ADR-0012 §DSAR-handling](../decisions/0012-privacy-compliance.md)) are self-serve; the user doesn't need to talk to a human. Articles 16 and 21 need a real person.

## Self-serve coverage

| User intent | Endpoint | What happens |
|---|---|---|
| "Export my data" | `/api/account/export` | Returns JSON: watch_entries, recommendations, streaming providers, feedback, group memberships, owned groups. Excludes Clerk private metadata + session tokens + anonymous behavioural signals + group invite tokens (documented in the route's response notes). Schema versioned (v3). |
| "Delete my account" | `/api/account/delete` | Two-stage: (1) anonymise watch signals (preserve aggregate analytics value), (2) hard-delete identifying records — users row, Clerk user, PostHog person profile. Idempotent; safe to retry. PostHog cleanup best-effort (Sentry-logged on failure). |

## Manual handling (Article 16, 21, anything weird)

**Inbound channel:** privacy@helpme2c.com (TODO: provision this address pre-launch; route to the maintainer's inbox until support team exists).

**Response timeline:** 30 days from receipt (GDPR Article 12(3)). Acknowledge within 72 hours.

**Verification:** confirm the requester owns the account. Easiest method: send them an in-app message asking them to reply from their account-bound email. Don't accept "I'm user X" claims from arbitrary email addresses — that's a social engineering surface.

**Once verified:**

1. **Rectification (Art. 16):** locate the row in question (`users`, `watch_entries`, etc), update via Drizzle SQL studio. Log the change with a free-text reason.
2. **Object to processing (Art. 21):** set the relevant consent toggle (analytics/sessionReplay) to off; if they object to all processing, treat as Art. 17 erasure.
3. **Anything else:** if uncertain whether to comply, default to "yes" — over-complying is rarely a problem; under-complying is regulatorily exposed.

## Data residency

All personal data is held in EU regions per [ADR-0012 §1](../decisions/0012-privacy-compliance.md):
- Neon Postgres: EU Frankfurt (`eu-central-1`)
- Sentry: `ingest.de.sentry.io`
- PostHog: `eu.posthog.com`

For non-EEA requesters, the same procedure applies (we honour CCPA / similar regimes by extending GDPR rights universally — see [ADR-0012 §non-EEA-policy](../decisions/0012-privacy-compliance.md)).

## What we DON'T anonymise on delete

Per [ADR-0012 §anonymisation-policy](../decisions/0012-privacy-compliance.md):
- **Aggregate watch signals** (anonymised to a UUID, retained for recommendation-engine training).
- **Group recommendation outputs** belonging to a group where other members remain — anonymise the deleted user's name; preserve the group context.

This is the legally significant choice: behavioural signals stripped of identifiers are not "personal data" under GDPR Recital 26.

## Audit trail

DSAR self-serve actions are logged to Sentry as `dsar.export_completed` / `dsar.delete_completed` breadcrumbs with the (now-deleted) clerk_id stripped to a hash. Vercel logs retain the request line for ~30 days.

For manual handling, append an entry to `.personal/dsar-log.md` (gitignored — that file holds the maintainer's private response notes per request).

## How we tell it's a DSAR vs noise

- Subject lines containing "GDPR", "data", "delete", "erasure", "export", "right to be forgotten", "DSAR" → treat as DSAR.
- Auto-serve endpoints called from in-app UI → not a manual DSAR, no human action needed.
- Inbound email asking generic privacy questions → reply with a link to `/privacy`; not a DSAR unless they then escalate.

## Failure modes

| Symptom | Likely cause | What to do |
|---|---|---|
| `/api/account/delete` returns 500 | Clerk side-effect failed mid-stage | Re-run; idempotent. Check Sentry for the failure point. |
| PostHog person profile not deleted | `POSTHOG_PERSONAL_API_KEY` env var missing or rotated | Set the env var; re-run delete (idempotent). |
| User reports they were re-suggested as a friend post-delete | Group rec cache wasn't invalidated | Manual: invalidate `user_recommendations` for any user in groups the deleted user was in. Phase 2: automate. |

## Pre-launch checklist

- [ ] privacy@helpme2c.com provisioned
- [ ] `POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID` set in production env
- [ ] `.personal/dsar-log.md` exists locally for the maintainer
- [ ] Smoke-test: export + delete from a test account, confirm Clerk + PostHog cleanup
