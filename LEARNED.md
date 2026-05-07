# LEARNED.md

Sharp edges, gotchas, and non-obvious behaviour we've hit while building HelpME2C.
Things that aren't obvious from the commit history or the ADRs — the kind of
"here's what bit us, here's what to do" notes that make future sessions faster.

This file is not a journal of what we did (`git log` covers that) and not a
contract (`CLAUDE.md` covers that). It's a list of **surprising things future-me
or a future contributor would otherwise re-learn the hard way.**

## When to add an entry

Add an entry when you've just spent more than ~15 minutes diagnosing something
that, in hindsight, has a one-line description. If the answer would have saved
you the hour, it goes here.

## When to remove an entry

When the underlying cause has been fixed at the source (vendor changed
behaviour, library upgraded past it, CLAUDE.md or an ADR now codifies the
guidance). Mark `RESOLVED <date>: <reason>` and remove in a follow-up cleanup
when the file gets long.

## Format

```
## <date> — <area>: <one-line summary>

**What bit us:** the specific symptom.

**Root cause:** why it happened.

**What to do:** the short workaround or the permanent fix.
```

Newest entries at the top.

---

## 2026-05-07 — Clerk: session-token customisation has top-level shortcodes only

**What bit us:** Configured `{ "dbSynced": "{{user.private_metadata.dbSynced}}" }`
in Clerk Dashboard → Sessions → Customize session token. The JWT shipped the
literal string `"{{user.private_metadata.dbSynced}}"` instead of the value.

**Root cause:** Clerk's session-token shortcode resolver supports top-level
paths only (`{{user.id}}`, `{{user.public_metadata}}`, etc.). Nested-field
templates like `{{user.public_metadata.field}}` pass through verbatim. The
"insert shortcodes" panel in the dashboard hints at this — only top-level
keys are listed — but the failure mode is silent (preview shows the literal,
not an error).

**What to do:** project the whole metadata object as one claim
(`{ "publicMetadata": "{{user.public_metadata}}" }`) and read nested fields
through `sessionClaims.publicMetadata.<field>` server-side. Anything projected
into the JWT is client-readable, so prefer `public_metadata` over
`private_metadata` to avoid implying privacy that doesn't exist.

---

## 2026-05-07 — Clerk: webhook test events 404 the user API

**What bit us:** "Send Example" from Clerk Dashboard → Webhooks fired a
`user.updated` event our handler accepted, then crashed when it called
`clerkClient.users.updateUser(eventUserId, { ... })` because the synthetic
user ID didn't exist in Clerk's instance.

**Root cause:** Clerk's example payloads use placeholder user IDs (e.g.
`user_2g7np7Hrk0SN6kj5EDMLDaKNL0S`) that aren't backed by real users. Any
follow-on Clerk API call against that ID returns 404.

**What to do:** in webhook handlers, catch the Clerk-specific 404
(`err.status === 404 && err.clerkError`) on follow-on API writes and
continue. Re-throw anything else. See `apps/web/src/app/api/webhook/clerk/route.ts`.

---

## 2026-05-07 — Vercel: auto-deploy silently skips builds outside Root Directory

**What bit us:** Pushed several commits to `main` that touched `CLAUDE.md`,
`docs/`, `.gitignore` — none of them deployed even though the GitHub
integration showed "Connected." Empty commits also didn't trigger.

**Root cause:** Vercel projects with a Root Directory configured (ours is
`apps/web/`) silently skip builds when the pushed diff has no changes inside
that subtree. It's a feature ("don't burn build minutes on doc changes"),
but the skip is silent — no notification, no log entry visible from the
project page.

**What to do:** for monorepo projects with a Root Directory, expect that
non-`apps/web/` commits won't auto-deploy. Either (a) accept it and use
`pnpm dlx vercel --prod` from the repo root for explicit deploys, or
(b) disable the skip via Settings → Git → "Ignored Build Step." We chose
(a) for Phase 1A — the skip is mostly correct.

---

## 2026-05-07 — Vercel CLI: deploy from repo root, not from `apps/web/`

**What bit us:** Ran `pnpm dlx vercel --prod` from `apps/web/` (where the
Next.js app is). The CLI errored with "path `apps/web/apps/web` does not exist."

**Root cause:** the Vercel project config has Root Directory = `apps/web`.
The CLI applies this *relative to the current working directory*. From
`apps/web/`, that becomes `apps/web/apps/web` — doubled.

**What to do:** always run `vercel link` and `vercel --prod` from the
**monorepo root**. The CLI writes `.vercel/` at the cwd, so linking from
the wrong place also leaves stale link metadata. If the link is wrong:
`rm -rf <wrong-path>/.vercel` then `vercel link` from the root.

---

## 2026-05-07 — drizzle-kit: hangs forever with the Neon WebSocket driver

**What bit us:** `pnpm db:migrate` hung indefinitely. The CLI showed
"applying migrations..." spinning for minutes, then killed itself. Logs:
`Using '@neondatabase/serverless' driver for database querying`.

**Root cause:** drizzle-kit auto-detects an installed driver. If only
`@neondatabase/serverless` is present, it uses the WebSocket variant —
which hangs inside the drizzle-kit subprocess (likely an interaction
between pnpm-bundled WS transport and drizzle-kit's CLI runtime, but
unconfirmed).

**What to do:** install `pg` and `@types/pg` as dev deps in `apps/web/`.
drizzle-kit prefers `pg` when available and connects via standard libpq
over TCP, which works. Runtime app code continues to use the Neon HTTP
driver per [ADR-0019](docs/decisions/0019-orm.md); `pg` is migration-only.

---

## 2026-05-07 — Inngest: SDK defaults to cloud mode locally; needs `INNGEST_DEV=1`

**What bit us:** Started `npx inngest-cli@latest dev` and the Next.js app
together. The Inngest dev server's auto-discovery probed `/api/inngest`
and got 500s repeatedly. App logs: `In cloud mode but no signing key found.
For local dev, set the INNGEST_DEV=1 env var.`

**Root cause:** the Inngest SDK defaults to "cloud mode" (expects a real
signing key, treats requests as production). For local dev with the CLI's
local server, it needs to be told it's in dev mode via `INNGEST_DEV=1`.

**What to do:** add `INNGEST_DEV=1` to `apps/web/.env.local` for local
development. **Never set this in production** — it would point the SDK
at a non-existent local server. Documented in `apps/web/.env.example`.

---

## 2026-05-06 — Drizzle schema: `index()` ≠ `uniqueIndex()`, ON CONFLICT needs the latter

**What bit us:** First real TMDB sync run failed on every show with
`Failed query: insert into "titles" ... on conflict ("external_id","source")
do update set ...`. The schema declared the (`external_id`, `source`)
composite as `index()`, expecting it to enforce uniqueness for the upsert's
ON CONFLICT target.

**Root cause:** Drizzle's `index()` creates a non-unique btree index.
ON CONFLICT (column-list) requires a UNIQUE constraint or UNIQUE index
matching those columns; otherwise Postgres rejects the query with "no
unique or exclusion constraint matching the ON CONFLICT specification."

**What to do:** for any column-set that an upsert ON CONFLICT targets,
declare with `uniqueIndex()` not `index()`. Comments saying "this should
be unique" don't satisfy Postgres. The fix is in
`apps/web/src/server/schema/titles.ts` (commit `349a50f`).

---

## 2026-05-06 — Neon: appending to `.env.local` without trailing newline corrupts the previous line

**What bit us:** `echo "INNGEST_DEV=1" >> .env.local` resulted in
`TMDB_API_KEY=82a5a865...INNGEST_DEV=1` on the same line. Both env vars
were broken.

**Root cause:** the file had no trailing newline. `echo >>` appends
without prepending one.

**What to do:** use `printf '\n%s\n' "VAR=value" >> file` if appending,
or just open the file in an editor. Easy to forget; cheap to fix once
you spot the symptoms (env var appears unset, neighbouring var also
mysteriously gone).
