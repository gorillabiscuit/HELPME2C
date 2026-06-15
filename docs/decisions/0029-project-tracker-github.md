# ADR-0029: Project tracker — GitHub Issues

**Status:** Accepted
**Date:** 2026-06-15
**Supersedes:** ADR-0018

## What we chose

**GitHub Issues** (on `gorillabiscuit/HELPME2C`) as the project tracker, replacing **Linear** (ADR-0018).

Issues, PRs, branches, and code references all live in one place, under one already-authenticated tool (`gh`), with automatic cross-linking between issues and PRs.

## What we rejected

- **Staying on Linear (ADR-0018).** Two practical failures: (1) the Linear connector authenticates per-workspace (OAuth is workspace-scoped), and the connected workspace did not contain the `HM2C` team named in ADR-0018 — only an unrelated team was visible; (2) the connection was unreliable across two days of use ("server isn't responding," then "connection invalidated, reconnect required"), repeatedly blocking issue filing. The tracker should never be the thing that's down.
- **Maintaining both** (Linear canonical, GitHub fallback) — split-tracker state is exactly the confusion this ADR removes.

## Why

- **One surface, one auth.** Issues next to the code; `gh` is already wired and reliable; issue↔PR links are automatic. No connector, no workspace selection, no token expiry.
- **Right-sized for the phase.** Solo/small team, Phase 1A. Linear's cycles/projects/roadmap surface isn't earning its keep yet; GitHub Issues + labels is enough for triage and planning at this size.
- **Reliability beats features for a tracker.** The repeated Linear outages made even basic filing impossible; co-locating with the repo removes that failure mode.

## What would change our mind

- The team grows and needs Linear's cycles / roadmap / cross-project planning.
- GitHub Issues proves too thin for triage volume (no good saved views, weak prioritisation) at scale.
- A reliable, correctly-scoped Linear connection becomes available and the planning surface is wanted again.

## Related

- **Supersedes [ADR-0018](0018-project-tracker.md)** (Linear).
- CLAUDE.md §1 (tracker pointer updated to match).
- First issues filed under this decision: #24 (onboarding loop bug) and #25–#29 (ADR-0028 implementation slices).
