# Architecture Decision Records (ADRs)

Architectural decisions for HelpME2C. Each ADR captures one decision with the alternatives we rejected and the signals that would make us reconsider. Lightweight — one page each. Format defined in `_template.md`.

## Format

Five sections per ADR: **Status / Date / What we chose / What we rejected / Why / What would change our mind / Related.**

## When to write one

Per `CLAUDE.md §10`, ADRs cover architectural decisions that:

- Have lasting impact on the codebase shape
- Have rejected alternatives worth recording (so we don't re-debate)
- A future contributor (or future-you) might question

Not every code-level choice needs an ADR. Pick a library? Probably not unless it's load-bearing. Pick a state-management approach across the whole frontend? Yes, ADR.

## When to update one

When the world changes:

- A library we picked has changed enough that the rejected alternatives now look better — re-decide via a new ADR that supersedes the old one
- A "what would change our mind" signal fires — same: new ADR, supersedes the old
- A typo or factual error — edit in place, don't create a new ADR

## Index

| # | Title | Status | Date |
|---|---|---|---|
| 0000 | Architecture overview | Draft | 2026-05-03 |
| 0001 | Monorepo tool | Accepted | 2026-05-04 |
| 0002 | Frontend framework | Accepted | 2026-05-04 |
| 0003 | API surface | Accepted | 2026-05-04 |
| 0004 | Auth provider | Accepted | 2026-05-04 |
| 0005 | Database (Postgres host) | Accepted | 2026-05-04 |
| 0006 | Vector store | Accepted | 2026-05-04 |
| 0007 | Job orchestration | Accepted | 2026-05-04 |
| 0008 | ML inference approach | Accepted | 2026-05-04 |
| 0009 | Streaming availability data source | Accepted | 2026-05-04 |
| 0010 | Observability stack | Accepted | 2026-05-04 |
| 0011 | Testing approach | Accepted | 2026-05-04 |
| 0012 | Privacy compliance approach | Accepted | 2026-05-04 |
| 0013 | Recommendation cache backend | Accepted | 2026-05-04 |
| 0014 | Styling approach (web) | Accepted | 2026-05-04 |
| 0015 | API deployment shape (tRPC inside Next.js) | Accepted | 2026-05-04 |
| 0016 | Component library (shadcn primary, MUI DataGrid carve-out) | Accepted | 2026-05-05 |
| 0017 | Hosting platform (Vercel for Phase 1A with lock-in firewall) | Accepted | 2026-05-05 |
| 0018 | Project tracker (Linear, team HM2C) | Accepted | 2026-05-05 |
| 0019 | ORM (Drizzle) | Accepted | 2026-05-06 |
| 0020 | Group recommendation strategy | Proposed | 2026-05-07 |
| 0021 | Streaming availability — ranking vs filter | Proposed | 2026-05-07 |
| 0025 | Embedded video provider + cookie posture | Accepted | 2026-05-17 |
| 0027 | Reason feedback — missing axes, optional free-text, discovery log | Accepted | 2026-06-13 |

(0022–0024 and 0026 exist in this directory but are not indexed here yet; index backfill is a separate housekeeping task. More to be filled in as Phase 1 progresses. See `QUEUE.md` for pending decisions.)

## Numbering

ADRs are numbered chronologically as they're decided. Don't renumber. If an ADR is superseded, the superseding ADR gets a new number and references the old one — the old one gets a `Superseded by ADR-YYYY` line in its Status field.
