# Runbook: V4 content-descriptor extraction

**What it is:** the LLM-based extraction pipeline that produces V4 descriptors for each catalog title. Per [ADR-0025](../decisions/0025-viewer-experience-extraction.md), [ADR-0026](../decisions/0026-content-descriptor-storage.md), [ADR-0027](../decisions/0027-content-descriptor-scoring.md).

## What breaks if it's down (Anthropic API)

- Bulk re-extraction batches fail (Inngest function retries 3x, then fans out next batch).
- Per-title extraction calls return errors; `processCandidate` catches them and the title gets `failed` status in the batch summary.
- **Live recommendation flow is unaffected.** Existing V4 descriptors stay in `title_descriptors` / `title_themes` / `title_comparable_titles`. The recommender uses whatever's already there; missing descriptors contribute zero V4 signal but V1 tag-overlap still runs.

## Manual fallback

None needed — the pipeline is asynchronous. If Anthropic is down for hours, the bulk re-extract just runs slower; no user-facing impact.

## Status page

https://status.anthropic.com/

## How we tell it's Anthropic and not us

- `401 invalid_api_key` → key rotated or `ANTHROPIC_API_KEY` unset. Check `.env.local` / production env.
- `429 rate_limit_error` → we burst over Tier 2 TPM. Reduce script's `CONCURRENCY`. Or wait — the batch script handles per-call errors; per-batch retries kick in.
- `400 credit_balance_too_low` → top up at console.anthropic.com → Billing.
- Anthropic dashboard shows green but our calls fail → check our model id (`claude-sonnet-4-6` per `EXTRACT_MODEL` constant in `apps/web/src/server/themes/extract.ts`). Models occasionally retire.

## Scripts (under `apps/web/scripts/`)

| Script | Purpose | Cost | Time |
|---|---|---|---|
| `smoke-v4-precheck.ts` | Verify DB state — new tables present, columns shape, row counts. Idempotent. | $0 | <30s |
| `smoke-v4-extraction.ts` | Re-extract 5 fixed titles end-to-end; verify all 3 tables populated; report FK resolution. Use after schema or prompt changes. | ~$0.10 | ~1 min |
| `smoke-v4-recompute.ts` | Pick the user with the most ratings, run `recomputeUserRecommendations`, print top-5 + V4 overlap stats. Validates the recommend path end-to-end. | $0 | ~10s |
| `validate-prompt-v41.ts` | Re-extract a fixed 13-title eyeball set; print before/after `narrative_mode` with pass/fail verdict against expected shifts. Use after prompt iteration. | ~$0.30 | ~3 min |
| `validate-rec-profiles.ts` | Synthesise 5 diverse user profiles, run recompute, print top-10 per profile. Cleans up synthetic users. Validates rec quality across taste shapes. | $0 | ~30s |
| `bulk-v4-count.ts` | Pre-flight sizing — count of titles needing extraction + cost projections at three scope tiers. | $0 | <10s |
| `bulk-v4-extraction.ts` | Bulk extract N titles by popularity (default 500; `LIMIT=N` to override). Resume-safe (skips titles already V4-extracted). | ~$0.017–$0.022/call | 12s/call × N/concurrency |
| `reextract-deconstructs-v41.ts` | Re-extract titles labelled `deconstructs` at `prompt_version='v4.0'` to apply the v4.1 prompt fix. | ~$2 / ~80 titles | ~15 min |
| `backfill-trigram-resolution.ts` | Re-resolve `title_comparable_titles` rows with NULL `referenced_title_id` via pg_trgm fuzzy match. Pure DB (no Anthropic). Run after catalog growth. | $0 | ~1 min |

All scripts run from `apps/web/` cwd with:
```
pnpm dlx tsx --env-file=.env.local scripts/<name>.ts
```

## Cost forecast (Sonnet 4.6, v4.1 prompt)

- Per call: ~$0.017–$0.022 (cached system prompt amortises across batches within 5-min window).
- Full catalog (~5,839 titles missing V4): **~$100–130**.
- Top 500 by popularity: ~$10.
- Top 2000 by popularity: ~$35.

If costs balloon: check that prompt caching is firing. The `cache_control: ephemeral` block is in the system prompt; subsequent calls within 5 min pay 10% of input cost. Without caching, the 2000-token system prompt dominates each call.

## Prompt versioning

`PROMPT_VERSION` constant in `apps/web/src/server/themes/extract.ts`. Bump when changing the prompt content.

History:
- `v1` — original Haiku-based closed-vocab themes (synopsis-only).
- `v4.0` — viewer-experience reframing, Sonnet 4.6, eight fields ([ADR-0025](../decisions/0025-viewer-experience-extraction.md)).
- `v4.1` — sharpened `narrative_mode` definitions to reduce false `deconstructs` labels.

Per-row `prompt_version` is stored in `title_descriptors` and `title_themes` so cohorts are queryable for selective re-extraction.

## Common operations

**Apply a prompt change:**
1. Edit prompt in `extract.ts`; bump `PROMPT_VERSION` ("v4.2", "v4.x").
2. Run `validate-prompt-v41.ts` (or write a v4.x variant) on the 13 eyeball titles to confirm expected shifts.
3. If looks good: targeted re-extraction of affected cohort (e.g. all `v4.0 narrative_mode='deconstructs'` rows via a one-off variant of `reextract-deconstructs-v41.ts`).
4. Verify `pnpm dlx tsx --env-file=.env.local scripts/validate-rec-profiles.ts` still produces sensible rec ordering.
5. Commit + push.

**Extend bulk coverage:**
1. Run `bulk-v4-count.ts` to size + project cost.
2. Run `bulk-v4-extraction.ts` with appropriate `LIMIT`. Pipe stdout through `tee` for log retention.
3. Once complete: run `backfill-trigram-resolution.ts` to re-resolve any unresolved comparable strings that now match new catalog rows.
4. Run `validate-rec-profiles.ts` to confirm quality didn't regress.

**Catalog broadening:**
1. `catalog-broaden-prestige.ts` (English + foreign-language prestige TV) — guarded by `WIDEN_OK=yes`.
2. Then re-run `bulk-v4-extraction.ts` to V4-extract the new titles.
3. Then `backfill-trigram-resolution.ts`.

## What we don't do via this pipeline

- **No per-episode extraction** (deferred per [ADR-0025 §what-we-rejected](../decisions/0025-viewer-experience-extraction.md)).
- **No embedding generation** (Phase 2 work per [ADR-0027 §what-we-rejected](../decisions/0027-content-descriptor-scoring.md)) — `viewer_pleasures` / `tone` / `subtextual_themes` are stored but not scored.
- **No real-time on-rate** — extraction is batch only, never on the user-facing rec read path.

## Pre-launch checklist

- [ ] `ANTHROPIC_API_KEY` set in production env
- [ ] V4 descriptor coverage on top-N most popular titles (check via `bulk-v4-count.ts`)
- [ ] `validate-rec-profiles.ts` produces sensible top-10s for 5 diverse profiles
- [ ] `backfill-trigram-resolution.ts` has been run after the most recent catalog growth
