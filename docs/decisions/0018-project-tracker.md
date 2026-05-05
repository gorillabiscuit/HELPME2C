# ADR-0018: Project tracker (Linear)

**Status:** Accepted
**Date:** 2026-05-05
**Supersedes:** —

## What we chose

**Linear** as the project tracker for HelpME2C.

- **Workspace:** `wouterschreuders`
- **Team:** `HelpME2C`, identifier `HM2C`
- **Project:** `HelpME2C` — https://linear.app/wouterschreuders/project/helpme2c-996bf32f55cd/overview
- **Issue ID format in commits:** `HM2C-X` (already the canonical example in [CLAUDE.md §5](../../CLAUDE.md))

Tickets describe scope and acceptance criteria for chunks of work. They are workflow artifacts, not load-bearing knowledge — implementation discussion stays in PRs, architectural decisions stay in ADRs, code stays in the repo.

## What we rejected

- **GitHub Projects v2** — strongest alternative; native to where the code lives, free, automatic PR↔issue cross-linking, no second tool to manage. Lost on tooling integration: no native MCP in this Claude session, weaker keyboard UX, less mature cycles/labels model. Right answer if the priority were "fewer SaaS tools" over "best tool for the job."
- **Notion** — flexible databases but not tracker-shaped; slower than Linear for ticket-flow work.
- **Markdown `TODO.md` in repo** — zero infrastructure but doesn't scale past ~20 active tickets and lacks status/priority/labels. Acceptable for very small projects; HelpME2C's Phase 1A scope will exceed this in the first cycle.
- **Jira / Height / Shortcut / ClickUp** — overkill for solo dev; mostly paid; no clear capability win.
- **Trello** — too simple for a multi-phase project with cross-references between tickets, ADRs, and commits.

## Why

The decisive factor is **Linear's MCP integration in this Claude session**: I (the agent) can read, create, update, comment, and link tickets without you context-switching to a separate tool. For chat-driven AI-assisted development — which is the actual working pattern for this project — that compounds across every ticket worked.

Linear's cycles/projects model maps cleanly to HelpME2C's phase-based structure (Phase 1A → cycle 1, Phase 1B → cycle 2, etc).

The vendor-lock-in concern that drove [ADR-0017](0017-hosting-platform.md) doesn't apply with the same weight here. Tickets are workflow artifacts: the information that matters about a project (decisions, why, how it works) lives in ADRs, commits, and code. Linear has CSV/JSON export. Switching trackers later is a one-time migration, not a rewrite. The strongest argument for vendor diversification (don't put load-bearing knowledge into a black box) is structurally addressed by keeping that knowledge out of tickets in the first place.

The `HM2C` team identifier matches the canonical commit-trailer format already established in [CLAUDE.md §5](../../CLAUDE.md) (`HM2C-15` example). A small but real coherence benefit — the contract was written in anticipation of this choice.

## Conventions pinned

### What goes in tickets

- Title (concise, behavior-named — "User can rate a title 1–5 stars" not "RatingComponent")
- Description with explicit acceptance criteria (mappable from PR diff per [CLAUDE.md §7](../../CLAUDE.md) pre-PR review)
- Priority, status, labels for filtering
- Links to relevant ADRs and files in the repo
- Cycle/project assignment

### What does NOT go in tickets

- Implementation discussion → PRs
- Architectural decisions → ADRs (`docs/decisions/`)
- Code, fixtures, schemas → the repo
- Long design docs → ADRs or per-package `CLAUDE.md`

### Issue IDs in commits

- Format: `<type>(<scope>): <subject> (HM2C-X)` per [CLAUDE.md §5](../../CLAUDE.md), e.g. `feat(ml): add tag-overlap scoring (HM2C-15)`.
- One ticket per logical chunk of work, not one per individual commit (a multi-commit feature still references one ticket across the chain).

## What would change our mind

- Linear's pricing changes in a way that materially impacts solo-dev usage (currently free tier covers our needs).
- We outgrow Linear's free tier and an alternative becomes economically obvious.
- A team scenario emerges where GitHub Projects' native PR↔issue linking outweighs Linear's MCP integration (e.g. open-source contributors who shouldn't need a Linear account).
- Linear's MCP integration becomes unmaintained or unreliable enough that the chat-driven workflow degrades.

## Migration path if we leave Linear

- CSV/JSON export from Linear preserves issue history.
- Commit messages reference `HM2C-X` IDs; any successor tracker that supports custom prefixes (most do) can adopt the same convention without breaking historical references.
- The artefacts that actually carry HelpME2C's knowledge (ADRs, code, commits) survive any tracker migration unchanged — see "Why" above.

## Related

- CLAUDE.md §1 (Tracker — updated by this ADR's commit)
- CLAUDE.md §5 (commit conventions; `HM2C-X` example was already canonical)
- CLAUDE.md §7 (pre-PR review uses ticket acceptance criteria)
- KICKOFF.md §Phase 3 (ticket decomposition begins after Phase 2 bootstrap)
- ADR-0017 (hosting platform; same anti-vendor-lock-in logic, applied differently — tickets are workflow not knowledge)
