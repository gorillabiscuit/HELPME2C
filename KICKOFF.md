# HelpME2C — kickoff

You are the first Claude Code session opened on this project. This document tells you what's already been decided, what hasn't, and what you should do first. **Read this before doing anything else.**

---

## What this project is

A cross-medium recommendation engine that matches viewers to shows based on **themes, character arcs, and tropes** — not flat genre or popularity. Defensible differentiator: **group recommendations** (find what 2+ people with different taste profiles will both enjoy, even when one of them isn't a registered user).

Critical reframing flag: **this is NOT an anime-first platform**. It's medium-agnostic. The product helps anime watchers find non-anime shows their non-anime-watching partner will enjoy, and helps non-anime watchers cross over into anime that match what they already like in TV. The recommendation taxonomy is theme-based, not medium-based.

Full product context: read **PROJECT.md** next.

---

## Project state when you opened this

**Phase 0: complete.** A previous Claude Code session (running in a different project, the `ai_prompt_agent` Python project) walked through:

- Product brief refinement (output: `PROJECT.md`)
- Architecture overview (output: `docs/decisions/0000-architecture-overview.md`)
- Working contract setup (output: `CLAUDE.md`)
- Pre-PR review pattern (output: `.claude/commands/pre-pr.md`)
- Pre-push AI-attribution hook (output: `scripts/scan-ai-attribution.sh`)
- ADR template + queue of pending stack-selection decisions (output: `docs/decisions/`)

That session was on a different codebase intentionally — the user wanted to start this project absolutely clean, no fingerprints from the source project. So none of the actual implementation code exists yet. The artefacts you see in this repo are the **design + contract scaffolding** for you to build on.

**Phase 1 (your starting point): finalise the stack-selection ADRs.** See `docs/decisions/QUEUE.md` for the list. Each pending ADR has a recommended choice with reasoning + alternatives. Walk through them with the user, finalise each as a real numbered ADR (`0001-monorepo-tool.md` etc), then commit.

**Phase 2 (after Phase 1): bootstrap the actual repo.** `pnpm init`, `pnpm-workspace.yaml`, ESLint + tsconfig + Husky + lint-staged + Vitest, the actual `apps/` and `packages/` directories with a "hello world" in each. Get to a green-gate state.

**Phase 3 (after Phase 2): decompose Phase 1A scope into tickets.** Take `PROJECT.md`'s Phase 1A section and break into 1–4 hour tickets in whatever tracker the user picks (Linear, GitHub Projects, etc). Then start building.

---

## What you do RIGHT NOW

In order:

1. **Read `PROJECT.md`** end-to-end. Understand what HelpME2C is and isn't.
2. **Read `CLAUDE.md`** end-to-end. This is the working contract you operate under for the rest of the project. It includes banned patterns, stop-and-ask rules, the §7 pre-PR review behavioural rule, testing conventions, etc.
3. **Read `docs/decisions/0000-architecture-overview.md`** for the macro picture.
4. **Read `docs/decisions/QUEUE.md`** to see what stack decisions are pending.
5. **Greet the user and confirm direction.** Specifically:
   - Confirm you understand the project (one sentence summary back to them — let them correct you if you've absorbed it wrong).
   - Confirm Phase 1 is the next step (walking through the ADR queue together).
   - Ask which decision they want to start with — usually ADR-0001 (monorepo tool) but they might want to skip around.

Do not start writing code. Phase 2 (bootstrap) comes after stack selection is complete.

---

## What you don't do RIGHT NOW

- Don't initialise `package.json` / `pnpm-workspace.yaml` until ADRs are finalised. The choices in those files literally depend on the ADR outcomes.
- Don't write product code. There's no MVP feature work in Phase 1.
- Don't reference, import from, or even read the GeoRep codebase (`/Users/wouterschreuders/Code/GeoRep_Project/`). It was the source of the patterns you see here, but it's a deliberately separate project. No cross-pollination.
- Don't expand scope beyond what's in `PROJECT.md`. The brief was deliberately narrowed; if the user wants something added, push back per `CLAUDE.md §4` (stop-and-ask).

---

## Provenance

The patterns in this repo (CLAUDE.md structure, ADR five-section format, pessimistic meta-check sub-agent rule, pre-push AI-attribution hook, `/pre-pr` slash command) are ported from a Python project where they evolved over multiple PR cycles. The general philosophy is documented in `/Users/wouterschreuders/Code/claude-code-quality-bible.md` (a personal artefact of the user's, not part of this repo). Don't read or write to that file from this session — it's outside this project's scope. If the user references it, treat it as informational background, not as a contract.

The patterns are battle-tested but the **toolchain is fresh**. Python's ruff/mypy/pytest is replaced by ESLint/TypeScript-strict/Vitest. Commands and config files differ; the philosophy doesn't.

---

## When you finish reading

Tell the user:

> Read KICKOFF.md, PROJECT.md, CLAUDE.md, and the architecture overview. Ready to start on Phase 1 (stack-selection ADRs). The QUEUE has [N] pending decisions. Which one do you want to start with — recommend ADR-0001 (monorepo tool) since others depend on it.

Then wait for their direction.
