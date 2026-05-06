# CLAUDE.md — working contract for HelpME2C

This file is the contract between the human maintainer and the AI coding agent on this repo. It exists because AI-assisted code accumulates invisible technical debt fast without explicit guardrails. Every rule has been chosen because it catches an *AI-specific* failure mode, not just as general good engineering.

Keep this file under 500 lines. Detail goes in `docs/decisions/` (ADRs), per-package `CLAUDE.md` files, or external skills.

---

## 1. Project identity

- **Service:** HelpME2C — cross-medium recommendation engine for TV and anime.
- **Differentiator:** group recommendations with ghost-profile inference + theme-based cross-medium taxonomy.
- **Phase:** 1A (MVP, web only, registered users only). Target: TBD; no time pressure; ship when ready.
- **Tracker:** Linear — workspace `wouterschreuders`, team `HelpME2C` (key `HM2C`), project `HelpME2C` (per [ADR-0018](docs/decisions/0018-project-tracker.md)).
- **Read first:** `PROJECT.md` (product scope), `docs/decisions/0000-architecture-overview.md` (system shape).

### Repo structure

Monorepo, pnpm workspaces (per [ADR-0001](docs/decisions/0001-monorepo-tool.md)).

```
apps/
  web/        ← Next.js — also hosts the tRPC server (per ADR-0015)
  mobile/     ← Expo / React Native (Phase 2; stub now, real work later)
packages/
  shared/     ← cross-platform code (hooks, utils, types, schemas)
  ui/         ← React components for web
  ml/         ← recommendation engine module (cleanly separable for future API resale)
docs/
  decisions/  ← ADRs
scripts/      ← project-level scripts (gates, hooks)
.claude/
  commands/   ← Claude Code slash commands
```

A separate `apps/api/` deployment is deferred per [ADR-0015](docs/decisions/0015-api-deployment-shape.md); extraction triggers and migration path are documented there.

Each `apps/*` and `packages/*` has its own `CLAUDE.md` for package-specific rules. Root `CLAUDE.md` (this file) holds global rules.

---

## 2. Architectural invariants

Things that MUST be true. Violations get reverted, not patched.

- **Cross-package import direction.** `apps/web` imports from `packages/{shared,ui,ml}`. `apps/mobile` imports from `packages/{shared,ml}` and a separate `packages/mobile-ui` (NEVER `packages/ui` — web React ≠ React Native). No app imports from another app. (If `apps/api` is extracted later per [ADR-0015](docs/decisions/0015-api-deployment-shape.md), it imports from `packages/{shared,ml}`.)
- **`packages/shared` is platform-agnostic.** No DOM APIs, no React Native APIs, no Node-specific APIs unless wrapped behind a platform-detection layer. If you need a platform-specific implementation, expose an interface from `shared` and implement it per-platform in the consuming app.
- **`packages/ml` is the recommendation engine boundary.** It MUST be importable as a pure module from any caller. No coupling to Next.js, no coupling to a specific HTTP framework. This boundary exists so a future public API product can wrap the same module without rewriting (see PROJECT.md §revenue).
- **API surface is internally tRPC.** The web app calls the API via tRPC for end-to-end type safety. (Confirmed in `ADR-0003`.) A future REST/GraphQL public API is layered on top, never replaces the internal tRPC layer.
- **Datetimes in API responses are ISO-8601 UTC with `Z` suffix.** Local-time conversion happens in the client, never in the server.
- **All user-data deletion is real.** "Soft delete" with a `deleted_at` flag is OK for audit trail BUT the `/account/delete` endpoint MUST genuinely remove personal data within 30 days (GDPR requirement; see ADR-0012 for the full deletion + anonymisation rules — behavioural signals may be anonymised rather than deleted, identifying records must be hard-deleted). This is a §3 banned pattern violation if breached.

---

## 3. Banned patterns

The agent must not do any of these. If instructed to, stop and flag.

- **No `any` type.** Use `unknown` and narrow, or define a type. `// @ts-ignore` and `// @ts-expect-error` similarly banned without a one-line comment explaining why.
- **No `==` / `!=`.** `===` / `!==` only.
- **No `var`.** `const` by default; `let` if reassigned.
- **No console.log in committed code.** Use the project logger (introduced in Phase 1A observability work). `console.log` is a code-review-blocker.
- **No silent catch.** `try { ... } catch {}` and `try { ... } catch (e) { /* ignored */ }` both banned. Either log it, re-throw it, or surface it via the error-handling layer — never swallow.
- **No `as` type casts** without a one-line comment explaining why the type system can't verify it.
- **No hallucinated imports.** If the symbol doesn't exist in a real npm package at the version we have installed, don't write code calling it. TypeScript and ESLint catch most cases but verify.
- **No PII / secrets in source, tests, or fixtures.** Use env vars and `.env.example` placeholders.
- **No third-party scripts loaded into the web app at runtime** without an ADR and a stop-and-ask. (Performance, privacy, supply-chain risk.)
- **No `setTimeout` / `setInterval` for retry logic.** Use a typed retry library (e.g. `p-retry`) or write an explicit retry abstraction in `packages/shared`.
- **No `document` / `window` in `packages/shared`.** Platform-agnostic means platform-agnostic. Use `useEffect` or platform-specific code in the consuming app.
- **No `eval`. No `new Function(...)`. No dynamic `require()`.**
- **No production code paths gated by `NODE_ENV`.** Use feature flags (decided in `ADR-0010` if/when needed) or environment-driven config — not `if (NODE_ENV === 'production')` scattered through code.

---

## 4. Stop-and-ask list

Before doing any of these, pause and confirm with the human in the chat:

- **Adding a new dependency to any `package.json`.** Each new dep gets its own commit + a line in `DEPS.md` justifying it.
- **Rewriting a file when only a small change was requested.**
- **Changing the public shape of any API procedure** (path, input schema, output schema).
- **Changing the response semantics of an existing endpoint** in a way that could break a client, even if the shape looks identical. Announce as `BREAKING CHANGE vs <ticket>` and wait for confirmation.
- **Adding a new top-level directory** (`apps/foo`, `packages/bar`, anything new at the root).
- **Touching auth, JWT handling, session management, or privacy-control code.**
- **Introducing a new cross-cutting pattern** (a shared base class, a middleware, a global state slice).
- **Deleting or renaming anything in `docs/decisions/`.**
- **Calling an external API from new code paths** (TMDB, AniList, etc) — confirm rate limits, caching, and error handling before adding.
- **Touching the recommendation engine boundary** (`packages/ml/*`). This is the prospective product moat (see PROJECT.md §revenue); changes need explicit go-ahead.
- **Adding any kind of analytics / tracking pixel / third-party script.**

---

## 5. Commit conventions

- **Conventional commits:** `feat(scope): ...`, `fix(scope): ...`, `chore: ...`, `docs: ...`, `refactor: ...`, `test: ...`. Scope is usually the package or feature area.
- **One logical change per commit.** If you're mixing concerns, split.
- **Dependencies get their own commit.** Never bundle `package.json` changes into a feature commit.
- **No `Co-Authored-By: Claude`** or any AI co-author trailer. Commit as the human maintainer; no AI authorship claims anywhere in commit metadata.
- **No "Generated with Claude Code" footers.**

The pre-push hook (`scripts/scan-ai-attribution.sh`, wired in `.husky/pre-push`) automatically aborts pushes with AI-attribution trailers.

### Review-Note trailers

When the agent is uncertain about something in a commit that warrants post-hoc human review, add a trailer:

```
feat(ml): add tag-overlap scoring (HM2C-15)

Implements tag-overlap baseline for personal recs.

Review-Note: integration — the AniList tag taxonomy is fetched once at
build time. Re-verify behaviour once we add the daily refresh job.
```

Categories: `test-independence`, `logic`, `sanity`, `integration`, `security`, `perf`, freeform.

**Mirror the Review-Note in the PR description.** Trailer is for `git log --grep`; PR description is for the live reviewer.

Not every commit gets one. Only when genuine uncertainty exists.

---

## 6. Diff-reading protocol

When the agent presents a diff to the human, it MUST categorise the changes so the human can read with focus. Tags:

| Tag | Meaning | Human's duty |
|---|---|---|
| **Scaffolding** | Setup boilerplate, standard patterns, package markers | Skim |
| **Decision** | Architectural choice (naming, layout, pattern, library picked) | Read carefully; push back if wrong |
| **Logic** | Business / domain computation | Read and verify; ask "what if…" |
| **External** | Calls into TMDB, AniList, Sentry, PostHog, or any external system | Read and trace the data flow |
| **Security** | Auth, scoping, PII handling, error-message sanitisation, rate limits | Read line by line |

Scaffolding is the only category that may be skimmed. Everything else, the human confirms understanding before commit.

### 6.1 Tagging-escalation rule

**When in doubt, classify upward.** Never tag a Security or External change as Scaffolding. If a chunk *might* be security-relevant or *might* touch an external system, it gets the higher classification by default.

### 6.2 Acknowledgement requirement for Security / External

The human must explicitly acknowledge they've read each Security or External chunk before commit. "Acknowledged" / "OK" / "👍" works; silence does not. This forces a real read rather than a passive skim.

---

## 7. Pre-PR review

Pre-PR review is something the **agent does on demand**, not a checklist for the human to type commands through.

### Trigger

When the human says one of: `ship it`, `ready to PR`, `open the PR`, `submit the PR for HM2C-X`, `let's submit`, `pre-PR check`, or invokes `/pre-pr` — the agent runs the full review inline. No scripts for the human to launch, no commands for the human to copy-paste.

### What the agent does, in order

1. **Run the gates.** `pnpm typecheck && pnpm lint && pnpm test` (or whatever the canonical pre-commit equivalent is at the time). Report PASS/FAIL summary. If anything fails, stop and fix before continuing.
2. **Walk the diff.** `git diff origin/main...HEAD`. Tag every chunk Scaffolding / Decision / Logic / External / Security per §6 (apply §6.1 escalation + §6.2 acknowledgement).
3. **Pessimistic meta-check.** Spawn a fresh sub-agent (Explore type, no view of this conversation). Brief: *"Read CLAUDE.md, the relevant ADRs, and the branch diff (`git diff origin/main...HEAD`). Look for: rule violations (banned patterns, missing ADRs, missing DEPS.md entries), category/naming/scope mismatches, brittleness, things that pass the gates but a senior reviewer would flag. Report as Definitely-issue / Likely-issue / Maybe-issue / Looks-clean — file:line + quoted snippet per finding. Bias toward suspicion; assume at least three issues missed."* Resolution rule: every Definitely and Likely is fixed in the diff or has a Review-Note trailer. Maybes get a one-line decision.
4. **Acceptance-criteria mapping.** Read the ticket. For each AC bullet, point at file:line or "not satisfied".
5. **Commit hygiene + scope check.** One logical change per commit (per §5)? New deps in their own commits? Anything in the diff outside the ticket's scope?
6. **Rebase check.** `git rev-list --left-right --count origin/main...HEAD`. Flag if behind.
7. **PR description draft.** Three blocks (Summary / Test plan / Notes for reviewer). The Test plan **must** include a "Manual verification commands" subsection listing the exact actions a reviewer should run to exercise this PR's surface end-to-end. Pure-refactor PRs skip the subsection but say so explicitly.
8. **Output one consolidated handoff** inline (sections 1–7 above as one markdown document).
9. **Surface what only the human can do.** Three items, listed concretely: read the chunks tagged Decision/Logic/External/Security; run the manual verification commands; sign off with `ship it` or push back.

### What the human does

Three things, all irreducible:

1. **Read the chunks the agent flagged Decision / Logic / External / Security.** Eyes-on. The agent can't tell when its own categorisation was off — the human can.
2. **Run the manual verification commands** from the handoff. Skip only if the agent declared "no human-visible surface" (pure refactor) — and confirm that's true.
3. **Say `ship it`** (or `fix X first`).

### What happens on `ship it`

Agent does, in order:

1. Stages and commits any final changes (one logical change per commit per §5).
2. `git push`. The pre-push hook automatically runs the AI-attribution scan and aborts on any `Co-Authored-By: Claude` / Anthropic / "Generated with Claude Code" trailer.
3. Outputs the GitHub / Bitbucket PR-creation URL inline (or runs `gh pr create` if the user explicitly OK'd that, with the description from step 7 of the handoff).

### Why this design

The agent does everything programmatic. The human does only what's irreducibly human: read the diff, exercise the surface, decide. No scripts to launch. No commands to type beyond the natural-language trigger and `ship it`.

The only invisible automation is the **pre-push hook** (`scripts/scan-ai-attribution.sh` wired via `.husky/pre-push`). One-time install per clone (run by `pnpm install` if `prepare` script is set up — see README).

---

## 8. Testing conventions

- **Split sessions for tests on non-trivial logic.** Implementation in one conversation turn; tests written in a fresh turn (or by a sub-agent) with only the spec / contract visible. Prevents rubber-stamp tests that encode the agent's own misunderstanding.
- **One behaviour per test.** No multi-assert tests testing several things.
- **Name tests for behaviour, not method.** `test_returns_recommendation_list_for_valid_user_id` not `test_get_recommendations`.
- **No test is "green" until the human has run it locally at least once.** CI passing is necessary but not sufficient.

### 8.1 Test-isolation approach

| Category | Approach | What it means |
|---|---|---|
| **Scaffolding** (config, types, package boilerplate) | None | Nothing to rubber-stamp |
| **Simple Logic** (mechanical, narrow contract) | **A** — in-turn discipline | Agent writes impl, commits, then writes tests against ONLY the contract / docstring / ADR — not the implementation file |
| **Complex Logic** (recommendation scoring, group compatibility, anything in `packages/ml/*`) | **B** — sub-agent isolation | Agent writes + commits implementation. Then spawns a fresh sub-agent with **only** the contract, ticket, and CLAUDE.md — sub-agent writes tests in a genuinely separate context. Agent reviews output, commits. |
| **Pure-logic function with fully-known contract** | **C** — TDD | Tests written **before** implementation; human reviews tests; implementation written to make tests pass. |

Approach B is mandatory for anything in `packages/ml/*`. The recommendation engine is the moat; rubber-stamp tests there will hide real bugs.

### 8.2 Tools

- **Vitest** for unit + integration. Fast, ESM-native, jest-compatible API.
- **Playwright** for end-to-end (web).
- **MSW** (Mock Service Worker) for mocking external APIs (TMDB, AniList) in tests. Don't hit real APIs from CI.
- **React Testing Library** for component tests on web (and React Native Testing Library on mobile, Phase 2).

---

## 9. Commands (canonical)

Run exactly these (pnpm per [ADR-0001](docs/decisions/0001-monorepo-tool.md)):

```bash
# Install everything
pnpm install

# Dev — root invokes per-app
pnpm dev                                  # all apps in parallel
pnpm --filter=@helpme2c/web dev           # just web

# Type check (recursive across workspace packages)
pnpm typecheck

# Lint (single root flat config covers the whole monorepo)
pnpm lint
pnpm lint:fix

# Format (Prettier; markdown excluded per .prettierignore)
pnpm format                               # write
pnpm format:check                         # check only

# Tests (single root vitest config covers all packages)
pnpm test                                 # all tests
pnpm test packages/ml                     # narrow to a path

# All commit-stage gates at once
pnpm preflight                            # typecheck + lint + test (definition in root package.json)
```

**Pre-push gates** run automatically via `.husky/pre-push` and don't normally need invoking by hand:

```bash
bash scripts/scan-ai-attribution.sh       # AI-attribution scan
pnpm preflight                            # full preflight
```

**One-time install per clone:**

```bash
pnpm install                              # runs the `prepare` script, which invokes `husky` (v9) to wire .husky/_/ → .husky/ hook files
```

If any command fails on a clean checkout of `main`, that's a bug — file it.

**Pre-PR review** (gates, diff walk, meta-check, PR description) is not a command in this section — it's something the agent does inline when the human says `ship it` / `ready to PR` / etc, or invokes `/pre-pr`. See §7.

### 9.5 PR description template

PR descriptions are not commit-message dumps. Three short blocks:

```
## Summary

<1–3 bullets, plain English, what changed and why>

## Test plan

- [ ] <reproduction step 1>
- [ ] <reproduction step 2>
- [ ] <edge case>

### Manual verification commands

<exact commands or UI actions a reviewer should run to exercise this PR's
surface end-to-end. If pure refactor with no surface, say so explicitly>

## Notes for reviewer

<acceptance-criteria mappings; any Review-Note trailers from commits;
anything subtle worth flagging>
```

No emoji. No AI-attribution.

---

## 10. Documentation layout

| Location | Purpose | Audience |
|---|---|---|
| `CLAUDE.md` (this file) | Contract between human and AI; conventions and rules | Team + AI |
| `apps/*/CLAUDE.md` | Package-specific rules; inherits this file | Team + AI |
| `packages/*/CLAUDE.md` | Package-specific rules; inherits this file | Team + AI |
| `docs/decisions/` | ADRs (architecture decision records), numbered, chronological | Team |
| `DEPS.md` | One-line justification per npm dependency | Team |
| `PROJECT.md` | Product brief; what we're building, MVP scope | Team |
| `README.md` | How to set up + run | Anyone |
| `.personal/` *(gitignored)* | Human's private notes, scratch | Human only |

ADRs are lightweight — one page max. Format: *Status / Date / What we chose / What we rejected / Why / What would change our mind / Related.*

---

## 11. When the human asks for behaviour not in this file

If the human requests something that isn't covered here (and isn't obviously ad-hoc), propose adding a rule to this file before executing. The default is: new conventions get written down before being followed.

When the human rejects a rule, the reasoning goes in an ADR so future-the-human (and future-the-agent) know why.

---

## 12. When something feels wrong

If the agent is about to produce something it has low confidence in — architectural choice, non-obvious algorithm, security-adjacent code — it stops and surfaces the uncertainty to the human instead of generating plausible-looking but unverified code. "I don't know" is a valid answer and always preferable to a confident hallucination.

The same applies to the human. If a rule in this file is producing bad outcomes, propose changing it; don't quietly skip it.
