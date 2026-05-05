# DEPS.md — npm dependency justification

One line per dependency in any `package.json` in this monorepo. Dev dependencies and runtime dependencies both go here. Per `CLAUDE.md §5`, every new dep gets its own commit AND a line here, in the same commit.

## Why this exists

The day-1 dependency choices fade from memory in months. "Why do we have `lodash` if we have `radash`" or "what is `clsx` for?" become unanswerable conversations. Forcing a one-line justification per dep at install time keeps the answers live and forces "do we actually need this" thinking.

## Format

One row per dep:

```
- **<package-name>** *(@version-range)* — <one-line reason. Be specific. "utility library" doesn't count.>
```

Group by package within the monorepo (root, then per-app, per-package).

## Example

```
- **next** *(^15.0.0)* — the framework. ADR-0002.
- **@trpc/server** *(^11.0.0)* — internal API surface. ADR-0003. Pinned to v11+ for new app router compatibility.
- **zod** *(^3.22.0)* — runtime validation; backbone of tRPC schemas + form validation.
- **clsx** *(^2.1.0)* — conditional className composition for Tailwind. Lighter than classnames.
```

---

## Root (workspace)

- **typescript** *(^5.7.0)* — language. Required at root so per-package tsconfigs can extend `tsconfig.base.json` and the `pnpm typecheck` script has a compiler to invoke.
- **@types/node** *(^20.10.0)* — Node API typings. Required at root for tooling configs and scripts; matches the `engines.node` floor in `package.json`.
- **eslint** *(^9.18.0)* — linter. Single root flat config covers the whole monorepo (per step-2 architectural call).
- **@eslint/js** *(^9.18.0)* — official recommended JS rule preset for ESLint flat config.
- **typescript-eslint** *(^8.20.0)* — TypeScript parser + recommended rule preset (unified flat-config package, v8+).
- **eslint-config-prettier** *(^10.0.0)* — disables ESLint stylistic rules that would conflict with Prettier; loaded last in the flat config.
- **prettier** *(^3.4.0)* — formatter. Owns whitespace/quote/semicolon decisions so ESLint can focus on correctness.
- **globals** *(^15.14.0)* — shared env-globals lookup (e.g. `globals.node`) for ESLint flat config `languageOptions`.
- **vitest** *(^3.0.0)* — test runner. Single root config covers all packages (per the architectural call confirmed for step 3). Coverage tooling (`@vitest/coverage-v8`) deferred until a coverage gate is actually wanted.

## apps/web

(populated as Phase 2 progresses)

## apps/mobile

(populated in Phase 2 mobile work)

## packages/shared

(populated as Phase 2 progresses)

## packages/ui

(populated as Phase 2 progresses)

## packages/ml

(populated as Phase 2 progresses)

---

## Removal rule

When you remove a dep from `package.json`, remove its line here in the same commit. Don't leave dead entries — they confuse future readers.

## Audit cadence

Every Phase boundary (Phase 1A → 1B, etc.), do a `pnpm dlx depcheck` (or `pnpm dlx knip` for a more thorough check) and confirm every line in this file matches a real install. Remove dead entries; flag any installs that aren't justified here.
