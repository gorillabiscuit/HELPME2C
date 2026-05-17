# ADR-0012: Privacy compliance approach

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

GDPR is the regulatory floor. Complying with GDPR satisfies UK GDPR, Swiss FADP, and substantially overlaps with US state regimes (California CCPA, Virginia CDPA, etc.). HelpME2C is aimed at an international audience, so we comply at the highest bar in our reach.

Concrete decisions for Phase 1A:

### 1. Data residency

**Single EU region for all hosted data:** Neon EU, PostHog EU, Sentry EU, Axiom EU. This sidesteps the entire Schrems II / Standard Contractual Clauses / Data Privacy Framework layer of complexity for EU users at the cost of small latency overhead for non-EU users — acceptable trade given the read-heavy, pre-computed nature of recommendation reads (per ADR-0008).

### 2. Right to erasure (account deletion)

The `/account/delete` endpoint genuinely removes personal data within 30 days of request (covers backup propagation). The 30-day window is a hard ceiling, not a target.

- **Hard-deleted:** user account row, identifying links from watch entries, session data, third-party processor records (Sentry user IDs, PostHog person profiles, Axiom log records) via each provider's deletion API.
- **Anonymised (kept):** ratings, watch behaviour signals, derived taste-vector inputs, and any other behavioural data that is useful as aggregate signal for the recommendation engine. Anonymisation must be genuine — no rejoin path back to the user. Once the deletion job runs, the data is unlinkable.

This threads GDPR right-to-erasure (PII gone) and the moat (collaborative-filtering signal preserved).

### 3. Right to access (data export)

The `/account/export` endpoint returns a JSON download containing all personal data we hold: account profile, watch entries, ratings (in their pre-anonymisation, user-linked form), connected subscriptions, demographic inputs. Generated on demand; if size grows, async generation with a 24-hour-expiring download link.

### 4. Cookie consent — three toggles in 1A

- **Strictly necessary** — no toggle; auth, security, session. Always on.
- **Product analytics** — toggle. Controls PostHog event tracking.
- **Session replay** — separate toggle. Controls PostHog session replay specifically. Held separately from analytics because replay is materially more invasive (captures DOM state, input fields).

Default state before consent action: **no tracking fires.** The banner is non-blocking but persistent until the user acts (Accept all / Reject all / Customise). Marketing / affiliate becomes a fourth toggle in Phase 1B when affiliate links land.

PostHog session replay is configured with strict masking by default — input fields, auth flows, and any element marked sensitive are masked. This is the dependency from ADR-0010.

**Amendment 2026-05-17 (per ADR-0025):** Embedded YouTube trailer previews fall outside the three toggles above for Phase 1A. The trailer surface is core to the product, so opening the trailer modal is treated as the consenting gesture; YouTube cookies are set on iframe load. This is disclosed in the consent banner copy and the privacy page. A proper 4th "Embedded media" toggle (click-to-play with a thumbnail until consented) is queued for Phase 1B alongside the marketing/affiliate toggle. See ADR-0025 §"Phase 1B follow-up".

### 5. Age gate

Self-declared birth date at signup. Thresholds:

- **EU users: 16+** (we use the conservative GDPR-K floor across all EU regardless of member-state variation, which permits 13–16).
- **Rest of world: 13+** (COPPA-aligned floor; below this triggers verifiable-parental-consent rules in the US which are not viable for an MVP).

Signups below the regional threshold are rejected at the form level. The gate is a legal shield — if a user misrepresents their age, the documented declaration transfers the risk.

**Amendment 2026-05-17 (cold-start research, PR for TICKET 2 schema):**
The age-check now collects ISO-3166-1 alpha-2 **country** alongside birth date. Country is IP-defaulted via Vercel's `x-vercel-ip-country` header and editable by the user. The legal-gate region (`eu`/`row`) is derived from country at submit time (EU 27 + EEA 3 + UK + Switzerland → `eu`); the user no longer chooses region directly. Country is stored in `users.country` (nullable for pre-rollout rows) and in Clerk `publicMetadata.country`; `users.region` is preserved during the transition for backwards-compatibility with the legal-gate consumers, and a separate Phase 1B ticket will derive-from-country and drop the column once all rows are backfilled. The motivation for country granularity is streaming-availability filtering (TMDB `watch_region` requires per-country granularity) and a defensible per-user data-residency story.

A new `users.household` column (`solo` / `partner` / `family` / `housemates`, default `solo`) is added in the same schema migration. The user-facing collection surface ships in a follow-up PR; existing rows get the `solo` default until they re-onboard. Used to route group-recommendation aggregation strategy; not used for any taste-prior or demographic inference.

### 6. Privacy policy + Terms of Service

Generated template (Termly or iubenda) is acceptable for MVP launch. Lawyer review is **required before public marketing launch** (paid acquisition, press push, or any deliberate effort to drive non-tester traffic). Pre-launch testers + early adopters can survive on a template; legal exposure scales with user count and revenue.

### 7. Data Subject Access Request (DSAR) handling

Self-serve `/account/export` and `/account/delete` cover ~95% of DSARs. Edge cases (data correction, consent withdrawal beyond the cookie toggles, etc.) handled manually via support email within the 30-day GDPR response window.

### 8. Sub-processor disclosure

The privacy policy must list all third-party processors of personal data: Clerk (auth), Neon (database), Vercel (hosting + logs), PostHog (analytics + replay), Sentry (errors), Axiom (log retention), and — per ADR-0025 — Google/YouTube (embedded trailer previews; receives the visitor's IP, User-Agent, Referer, and any existing YouTube session cookies on iframe load). TMDB and AniList are not sub-processors — calls are server-to-server with no user PII transmitted.

### 9. PII redaction in observability

All third-party observability tools must be configured to redact PII before ingest:

- **Sentry** — `beforeSend` hook strips email, name, and any user-identifying request data from error context. User IDs only.
- **PostHog** — `process_person_profile: false` for anonymous sessions; identified sessions use opaque user IDs, never email.
- **Axiom drain** — log scrubber at the Vercel drain layer removes anything matching email / token / known-PII patterns before ship.

## What we rejected

- **Geo-split hosting (per-user region)** — operational tax for solo dev, no MVP benefit.
- **US-region hosting + Standard Contractual Clauses for EU users** — adds compliance complexity vs. single EU region.
- **Soft-delete only** — banned by CLAUDE.md §2 invariant.
- **"I'm 16+" checkbox in lieu of birth date** — birth date gives us region-specific thresholds and is industry standard.
- **Lawyer review before any user signup** — disproportionate to MVP scale; the right trigger is public marketing launch.
- **Marketing / affiliate consent toggle in 1A** — affiliate work is Phase 1B per PROJECT.md; adding the toggle pre-emptively gives users a control with nothing behind it.
- **Anonymisation as deletion for everything** — account, session, and identifying records must be hard-deleted; only behavioural signals get the anonymisation treatment.
- **Modal-blocking cookie banner** — UX-hostile; non-blocking persistent banner achieves the same compliance outcome.

## Why

GDPR is the strictest regime in our target audience. Complying at the GDPR floor gives us global cover and avoids the rabbit hole of regime-specific feature work in 1A.

EU-region defaults sidestep cross-border transfer complexity entirely. The latency cost for non-EU users is acceptable because:

1. Reads are pre-computed (ADR-0008) — page load is a fast key lookup, not an inference call.
2. Phase 1A is web-only; the few interactive flows (group recs) have a 2s p95 budget that absorbs cross-Atlantic latency comfortably.

Hard-delete-PII-while-anonymising-signal threads the right needle: the right-to-erasure obligation is satisfied (no link back to the user), and the recommendation engine moat is preserved (the signal is what makes the product defensible — see PROJECT.md §revenue).

Three-toggle consent is the minimum granularity GDPR's "specific, informed consent" requirement supports without making the banner unusable. Session replay as a separate toggle reflects its higher invasiveness; collapsing it into "analytics" would mean users either accept replay implicitly or lose all analytics — both bad outcomes.

The age gate exists because GDPR Article 8 makes processing under-16 EU users without parental consent a violation. Without verifying age, you have no defense. Self-declaration is the industry-standard legal shield — a misrepresented age transfers risk to the user, while the documented declaration shows the platform tried.

Template-now-lawyer-later matches the cost-risk curve: pre-launch users are testers and early adopters with low individual exposure; legal scrutiny scales with user count and revenue. Timing the lawyer review to public marketing launch concentrates the spend where the risk is.

## What would change our mind

- **Material US user concentration** — add California CCPA / Virginia CDPA-specific endpoints (mostly compatible with GDPR but require an explicit "Do Not Sell" link and slightly different consent UI).
- **A specific regulator issues guidance that contradicts our defaults** (UK ICO, French CNIL, Irish DPC).
- **Recommendation quality demonstrably suffers from anonymisation** — the moat hurt by the privacy posture. Likely fix: refine what "anonymisation" means rather than abandon the principle. Worst case, accept a small quality cost as a privacy tax.
- **Single EU region becomes a latency problem at international scale** — revisit region strategy in Phase 2 or 3.
- **Public marketing launch approaches** — lawyer-review trigger fires.
- **A new regime appears in our reach** (e.g., Brazil LGPD, India DPDPA) at material user volume — assess and add. Most are GDPR-derived and won't require structural change.

## Related

- ADR-0000 — architecture overview
- ADR-0004 — Clerk (handles email verification, account deletion plumbing for the auth side)
- ADR-0005 — Neon (EU region selection)
- ADR-0008 — ML inference (pre-computed reads, supports cross-Atlantic latency budget)
- ADR-0010 — Observability (PostHog consent + masking dependency originates here)
- PROJECT.md §Phase 1A scope (privacy controls)
- CLAUDE.md §2 (real user-data deletion invariant — this ADR provides the operational detail)
