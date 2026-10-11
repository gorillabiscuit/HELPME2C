# Worker rules for Codex (HelpME2C)

You were started for exactly one Linear card, in a lane: a folder under
`/Users/wouterschreuders/Code/HelpME2C/.worktrees/` holding that card's code on its own branch.
Your first message names the card, the lane, the branch and the branch it was cut from.

These are the Codex copy of the Claude worker rules in `SKILL.md` next to this file. Same rules,
Codex tool names. Read `SKILL.md` first, then `CLAUDE.md` at the repo root (written for Claude;
every line applies to you too), then the `CLAUDE.md` of each package you touch.

Differences for Codex:

- **Read the card** with the Linear connector's `get_issue` (card id, e.g. `HEL-3`). If the
  connector is missing, stop and say so in your first reply; it is set up with
  `codex mcp add linear --url https://mcp.linear.app/mcp` and `codex mcp login linear`.
- **Model.** The card names the intended Codex model in its "Harness" line (`gpt-6-astra`,
  `gpt-6.1-sol` or `gpt-6-luna`). Say in your first line which model you are actually on. If it
  differs, carry on and say so; do not stop for it.
- **Sandbox.** Never download or install a Node, a package manager, or anything outside the
  lane. If `pnpm preflight` fails inside the sandbox on permission or localStorage errors, that
  is the sandbox, not the code: ask Wouter's approval to run that one command outside the
  sandbox, and say so in your report.
- **Ending.** A Codex thread cannot archive itself; end on the six-line glance from rule 7 and
  leave the thread as it is. Name the thread with `set_thread_title` by the same convention:
  `<number> · helpme2c · <thing>`.
- **Never push. Never move a card to Done.** Same as Claude.
