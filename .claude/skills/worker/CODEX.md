# Worker and reviewer notes for Codex (HelpME2C)

Codex runs the same rules as Claude: `SKILL.md` next to this file for a worker, `REVIEWER.md`
for a reviewer. `CLAUDE.md` at the repo root is written for Claude; every line applies to you.
This file holds only what differs for Codex.

- **Model.** `scripts/card` picks the model from the card's label (`luna`, `sol`, `astra`).
  Say in your report which model you ran on.
- **Sandbox.** You can write only inside your checkout. Git's own files are read-only, so you
  never merge or commit (`scripts/card` does), and you have no network. Packages are already installed. Never run `pnpm install` or `pnpm add`, and
  never download a Node or a package manager. If you need a package that is not installed, that
  is a stop-and-ask: put it under Needs you.
- **Node.** The checks want Node 24. If `pnpm preflight` fails on
  `localStorage.getItem is not a function`, you are on the wrong Node: run it with
  `/Users/wouterschreuders/.nvm/versions/node/v24.16.0/bin` first on `PATH`.
- **Ending.** Your final reply is the report. There is nothing to archive or rename.
