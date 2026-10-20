# ADR-0031: Cards run by hand with `scripts/card`, no always-on dispatcher

**Status:** Accepted. Supersedes the dispatcher part of ADR-0030; Linear stays the tracker.
**Date:** 2026-10-20

## What we chose

A card is built only when the maintainer runs `scripts/card HEL-N` on his own Mac. The script
reads the card from Linear, makes one worktree and branch for it under `.worktrees/`, runs a
worker unattended (rules: `.claude/skills/worker/SKILL.md`), posts the worker's report on the
card, then runs a fresh reviewer that never sees the build (rules: `REVIEWER.md` next to it) and
posts that report too. Two lanes at most. `scripts/ship HEL-N` pushes and opens the pull request;
only the maintainer runs it. `.github/workflows/preflight.yml` runs `pnpm preflight` on every
pull request and on `main`.

Workers and reviewers run on Codex by default (`CARD_TOOLS=codex`), because Claude capacity is
the scarcer of the two; `CARD_TOOLS=labels` follows each card's `claude` / `codex` label again.

## What we rejected

- **The Polymodal dispatcher, polling the board (ADR-0030).** Ran 11–19 October 2026. It opened
  13 lanes; 12 never got a commit, its Linear reads failed with HTTP 400 (queries over Linear's
  complexity limit), and a second copy on another Mac kept taking cards. For one person a
  background poller cost more attention than it saved.
- **No automation at all.** The worker and the independent review are what make one person's
  cards trustworthy; only the polling goes.

## Why

One person works on this repo. Starting each card by hand keeps the number of open lanes, and
where the work runs, under his control, while the review still catches what the worker missed.

## What would change our mind

More than two cards a day that are ready at once, or a second person working on the repo.

## Related

ADR-0030 (Linear), CLAUDE.md §1 and §9, `scripts/card`, `scripts/ship`.
