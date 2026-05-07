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
- **husky** *(^9.1.0)* — git-hook manager. Wires `.husky/pre-commit` (lint-staged) and `.husky/pre-push` (AI-attribution scan + preflight) on `pnpm install` via the `prepare` script.
- **lint-staged** *(^15.0.0)* — runs ESLint and Prettier against staged files only at commit time. Keeps the pre-commit hook fast as the workspace grows.

## apps/web

**Runtime:**

- **next** *(^16.0.0)* — framework. ADR-0002. Hosts both rendering and the tRPC server per ADR-0015.
- **react** *(^19.0.0)* — required peer of Next 16. App Router uses Server Components by default per apps/web/CLAUDE.md.
- **react-dom** *(^19.0.0)* — required peer of React 19.
- **@trpc/server** *(^11.0.0)* — internal API. ADR-0003. Server-side runtime + router definitions.
- **@trpc/client** *(^11.0.0)* — typed tRPC client for browser code. ADR-0003. Required peer of `@trpc/react-query`.
- **@trpc/react-query** *(^11.0.0)* — React Query bindings for tRPC. ADR-0003. Provides `useQuery`/`useMutation` hooks with full end-to-end type inference from `AppRouter`.
- **@tanstack/react-query** *(^5.0.0)* — required peer of `@trpc/react-query`. Owns client-side caching, invalidation, and refetch lifecycle for tRPC calls.
- **@helpme2c/ml** *(workspace:\*)* — workspace dep for the recommendation engine module (CLAUDE.md §2 invariant: "packages/ml is the recommendation engine boundary"). Imported by tRPC routers, never by client components.
- **@helpme2c/shared** *(workspace:\*)* — workspace dep for shared utilities (e.g. `toIsoUtc` per CLAUDE.md §2 datetime invariant).
- **@helpme2c/ui** *(workspace:\*)* — workspace dep for cross-app React primitives (currently `<Mono>`). Most app-specific UI lives in `apps/web/src/components/`; this package is reserved for things genuinely shared or with no good app-level home.
- **zod** *(^3.23.0)* — runtime validation; backbone of tRPC procedure input schemas.
- **tailwindcss** *(^4.0.0)* — utility CSS. ADR-0014. v4 uses CSS-import + PostCSS plugin (no JS config file).
- **@tailwindcss/postcss** *(^4.0.0)* — required PostCSS plugin for Tailwind v4 build pipeline.
- **postcss** *(^8.5.0)* — peer of @tailwindcss/postcss; PostCSS engine that runs the Tailwind plugin.
- **class-variance-authority** *(^0.7.0)* — typed component-variant API used by shadcn primitives; foundation for the cn() helper and every Button/Input/Card variant. Per ADR-0016.
- **clsx** *(^2.1.0)* — conditional className composition; paired with tailwind-merge inside the `cn()` helper at apps/web/src/lib/utils.ts. Per ADR-0016.
- **tailwind-merge** *(^2.6.0)* — merges Tailwind classes safely (resolves conflicts like `px-2 px-4` → `px-4`); paired with clsx inside `cn()`. Per ADR-0016.
- **lucide-react** *(^0.469.0)* — icon library pinned by ADR-0016. shadcn's default; AI-tooling-friendly.
- **radix-ui** *(^1.4.3)* — consolidated Radix UI primitives meta-package; single dep covering Slot, Label, Dialog, Popover, etc. Modern shadcn convention (replaces installing each `@radix-ui/react-*` package separately). Per ADR-0016.
- **@clerk/nextjs** *(^7.3.0)* — auth provider's Next.js SDK per ADR-0004. Provides `<ClerkProvider>`, hosted auth UI components (`<SignInButton>`, `<SignUpButton>`, `<UserButton>`, `<Show>`), `clerkMiddleware()` for `proxy.ts`, and `auth()` for server-side session access.
- **@sentry/nextjs** *(^10.51.0)* — Sentry's Next.js SDK per ADR-0010. Configures three runtimes (browser via `instrumentation-client.ts`, Node server via `sentry.server.config.ts`, Edge middleware via `sentry.edge.config.ts`) with PII redaction per ADR-0012 §9 (`sendDefaultPii: false` + `beforeSend` belt-and-suspenders). No session replay (PostHog handles that per ADR-0010). Source map upload deferred to production deploy.
- **posthog-js** *(^1.372.9)* — PostHog client-side SDK per ADR-0010 (product analytics + session replay). Initialized once with `opt_out_capturing_by_default: true`; the consent-aware `<PostHogProvider>` flips opt-in/opt-out and starts/stops session recording based on the GDPR banner toggles per ADR-0012 §4. Strict masking (`mask_all_text`, `maskAllInputs`) and `person_profiles: 'identified_only'` per ADR-0012 §9.

- **drizzle-orm** *(^0.45.2)* — ORM. ADR-0019. TypeScript-native schema + query builder; no codegen step. Used with the Neon serverless adapter for all DB access from tRPC procedures.
- **@neondatabase/serverless** *(^1.1.0)* — Neon's serverless Postgres driver. ADR-0019. Required adapter for Drizzle to connect to Neon without traditional TCP connection-pool issues in serverless/edge environments.

**Dev:**

- **drizzle-kit** *(^0.31.10)* — Drizzle CLI for schema introspection, migration generation (`drizzle-kit generate`), and migration application (`drizzle-kit migrate`). Dev-only; not shipped to production.
- **pg** *(^8.20.0)* — `node-postgres` driver. Used by drizzle-kit only (so dev-only): the Neon serverless WebSocket driver hangs inside `drizzle-kit migrate`, so `pg` is the migration-time driver. Runtime app code still uses `@neondatabase/serverless` per ADR-0019.
- **@types/pg** *(^8.20.0)* — TypeScript types for `pg`. Dev-only; required for typecheck.
- **@types/react** *(^19.0.0)* — React 19 type definitions.
- **@types/react-dom** *(^19.0.0)* — React DOM type definitions.

## apps/mobile

(populated in Phase 2 mobile work)

## packages/shared

(populated as Phase 2 progresses)

## packages/ui

(populated as Phase 2 progresses)

## packages/ml

(populated as Phase 2 progresses)

## packages/ui

**Runtime:**

- **react** *(^19.0.0)* — React 19. Matches `apps/web`; pnpm dedups at install.
- **react-dom** *(^19.0.0)* — required peer of React 19 for any `react-dom`-targeted JSX.

**Dev:**

- **@types/react** *(^19.0.0)* — React 19 type definitions; required for typecheck.
- **@types/react-dom** *(^19.0.0)* — React DOM type definitions; required for typecheck.

---

## Removal rule

When you remove a dep from `package.json`, remove its line here in the same commit. Don't leave dead entries — they confuse future readers.

## Audit cadence

Every Phase boundary (Phase 1A → 1B, etc.), do a `pnpm dlx depcheck` (or `pnpm dlx knip` for a more thorough check) and confirm every line in this file matches a real install. Remove dead entries; flag any installs that aren't justified here.
