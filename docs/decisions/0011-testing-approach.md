# ADR-0011: Testing approach

**Status:** Accepted
**Date:** 2026-05-04
**Supersedes:** —

## What we chose

For Phase 1A:

- **Vitest** for unit + integration tests across all packages.
- **Playwright** for end-to-end tests (web only). React Native Testing Library lands when mobile starts (Phase 2).
- **MSW (Mock Service Worker)** for mocking external HTTP APIs (TMDB, AniList) in tests. Tests must run offline.
- **React Testing Library** for component tests on web.
- **Neon database branching** for tRPC router / integration tests that need a real database. Each CI run gets an ephemeral branch; the branch is deleted on completion. No mocked DB layer for router tests.
- **No DB access in `packages/ml` tests** — pure functions, plain object inputs, per packages/ml/CLAUDE.md.

The four testing approaches in CLAUDE.md §8.1 (A in-turn / B sub-agent isolation / C TDD) remain authoritative. Approach B is mandatory for `packages/ml` per the moat-protection rule.

### Coverage policy

- **`packages/ml`: 80% line coverage floor.** Enforced as a CI gate. The recommendation engine is the moat (PROJECT.md §revenue); rubber-stamp tests there hide real bugs that would ship to a future paying customer.
- **Everywhere else: no coverage gate.** Reviewer judgment per the §6 diff-tagging rules. Tests where they pay off, not for the metric.

### E2E scope cap (Phase 1A)

Playwright tests in 1A are limited to **smoke tests covering the critical user paths**:

- Signup
- Login
- Add a title to the watch list
- Generate a personal recommendation
- Generate a group recommendation (registered users only — ghost profiles are Phase 1B)
- Account deletion (verifies real deletion per ADR-0012 and CLAUDE.md §2)

Any E2E coverage beyond these is Phase 1B. The cap exists because Playwright suites grow without discipline and slow CI to a crawl.

### Snapshot tests

**Banned by default for component logic.** They are a known rubber-stamping vector — the agent updates a snapshot blindly when the UI changes and the test silently re-passes.

**Allowed for stable serialised output** (e.g., the cross-medium taxonomy normaliser, fixed scoring formula outputs) with a one-line comment explaining why a snapshot is the right shape for that test.

### Flake policy

- **Retry once in CI; fail on the second flake.** Auto-retry-until-pass is banned — it hides real bugs.
- **A test that flakes gets a tracking note** (issue, Review-Note trailer, or commit comment, depending on context) and a **7-day fix window**.
- **If unfixed at 7 days, the test is deleted.** A flaky test that no one fixes is worse than no test — it teaches everyone to ignore CI failures.

## What we rejected

- **Jest** — works, but Vitest is faster, ESM-native, and the API is jest-compatible. No reason to choose Jest in 2026.
- **Cypress** — fine, but Playwright has better cross-browser support and is now standard.
- **Real API calls in tests** — explicit ban. Tests must run offline (MSW exists for this).
- **Mocking the DB layer in router / integration tests** — same rubber-stamping risk as snapshot tests. Neon branching makes a real DB cheap enough that the mock isn't worth it.
- **testcontainers (Postgres in Docker)** — viable, but adds startup tax to every CI run when Neon branching gives us the same fidelity for free.
- **Coverage floor across the entire repo** — overshooting. The moat package gets the gate; the rest gets reviewer judgment.
- **Unbounded E2E suite in 1A** — Playwright sprawl is a known anti-pattern. Cap and revisit at Phase 1B.
- **Auto-retry-until-pass for flakes** — hides real bugs.

## Why

This codifies what CLAUDE.md §8 already assumes, plus the gaps that were silently undecided:

1. **Coverage targets.** Without a stated policy, agents tend to drift toward "more tests = more good." The §1 "moat-only floor" matches the moat-protection logic that runs through the rest of the architecture.
2. **E2E scope cap.** Playwright is excellent and dangerous. The cap forces explicit Phase 1B negotiation before the suite grows.
3. **DB strategy for routers.** Neon branching is native to ADR-0005. Real-DB tests catch migration bugs that mocked tests pass through silently — the same class of bug the global feedback rule guards against.
4. **Snapshot policy.** Snapshots are useful for stable serialised output and dangerous for component logic. Splitting the rule by use case keeps the useful 5% and bans the dangerous 95%.
5. **Flake policy.** A 7-day fix window is short enough that flakes can't accumulate and long enough that a real fix is feasible. Deletion is the alternative to ignoring CI.

All five decisions follow the same pattern: bias toward genuine signal over green-checkmark theatre. AI-assisted code accumulates rubber-stamp tests fast without explicit guardrails.

## What would change our mind

- **Neon branching cost or quota becomes a problem at CI scale** — fall back to testcontainers Postgres.
- **`packages/ml` coverage floor proves wrong** — either too low (real bugs ship) or too high (test theatre dominates real work). Adjust the floor; don't remove the gate.
- **Smoke E2E proves insufficient for 1A confidence** — expand the cap, deliberately, with a list. Don't open the floodgates.
- **Snapshot ban becomes friction in a specific package** — revisit per package, not globally.
- **Flake fix window proves too aggressive** — extend to 14 days; do not remove the deletion fallback.

## Related

- ADR-0000 — architecture overview
- ADR-0005 — Postgres host (Neon, enables branching)
- ADR-0008 — ML inference approach (`packages/ml` testing posture)
- PROJECT.md §Phase 1A scope
- CLAUDE.md §8 (testing conventions — this ADR ratifies and extends)
- packages/ml/CLAUDE.md (Approach B mandatory; this ADR confirms)
