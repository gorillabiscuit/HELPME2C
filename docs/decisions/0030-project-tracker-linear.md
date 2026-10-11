# ADR-0030: Project tracker — Linear, dispatched

**Status:** Accepted
**Date:** 2026-10-11
**Supersedes:** ADR-0029

## What we chose

**Linear**, workspace `helpme2c` (`linear.app/helpme2c`), team **HEL**, as the only project tracker. Cards are written for the dispatcher (`~/Code/Polymodal/bin/dispatch`): every card that is code work carries a `## Base` line, the maintainer's own words, one acceptance line, a harness label (`claude` or `codex`), a model label (`fable` / `opus` / `sonnet` / `haiku` for Claude; `astra` / `sol` / `luna` as intent for Codex), and `pr` when the lane ends as a pull request to `main`. The dispatcher opens one worker session per card in its own worktree under `.worktrees/`; the worker's rules are `.claude/skills/worker/SKILL.md` (Claude) and `.claude/skills/worker/CODEX.md` (Codex). The maintainer still pushes and still decides Done.

The nine GitHub issues open on 2026-10-11 (#24–#36) were moved to HEL and closed on GitHub with a pointer. GitHub Issues is no longer used for anything; a pull request references its HEL card in the description.

## What we rejected

- **Staying on GitHub Issues (ADR-0029)** — the dispatcher and the independent-review loop are Linear-driven; GitHub Issues has no state machine the dispatcher can act on (Todo → In Progress → In Review → Needs you → Done).
- **Both trackers** — the split-tracker confusion ADR-0029 removed; still rejected.
- **A HelpME2C-specific copy of the dispatcher** — 87 KB of script that would drift from the original. The dispatcher is generalised instead (its own card in the Polymodal workspace) and reads this repo's `dispatch.json`.

## Why

ADR-0029 left Linear for two reasons: the connector showed the wrong workspace, and the connection was unreliable. Both are gone. Connections are now one personal API key per workspace, read from `~/.config/linear/<name>-token` by a header helper, so the key decides the workspace and nothing is chosen in a UI. The HelpME2C key lives at `~/.config/linear/helpme2c-token`. ADR-0029 named exactly this as what would change our mind: "a reliable, correctly-scoped Linear connection becomes available and the planning surface is wanted again."

The planning surface is wanted because the work is now parallel. The persona evaluation of 2026-10-11 produced a dozen cards with real dependencies between them (harness before engine changes, merge fix before wiring, solo quality before ghost profiles). Blocking relations, a board with a Needs-you lane, and a dispatcher that opens a worker per card are what make that run without the maintainer hand-holding each session.

## What would change our mind

- The dispatcher cannot be generalised to a second repo without a fork; then the trade-off in "what we rejected" flips.
- Linear becomes unreliable again for more than a day; the tracker must never be the thing that is down.
- The team grows past one maintainer and wants pull-request-centred review; GitHub Issues + Projects could return.

## Related

- Supersedes [ADR-0029](0029-project-tracker-github.md); ADR-0029 superseded [ADR-0018](0018-project-tracker.md).
- CLAUDE.md §1 (tracker pointer), §5 (commit scope shows the card id, e.g. `feat(ml): … (HEL-12)`), §7 (pre-PR review still runs per card).
- `dispatch.json` at the repo root; `.claude/skills/worker/`.
