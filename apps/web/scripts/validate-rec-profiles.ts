// Multi-profile rec validation harness.
//
// Synthesises 5 diverse user profiles, runs recomputeUserRecommendations
// against each, prints the top-10 recs + V4-signal-overlap stats. Lets
// you eyeball rec quality across taste types without needing real
// testers.
//
// Why: post-normalisation V4 actually drives rankings, but our only
// real test user has 1 rated entry. Synthetic profiles cover the range
// of "taste shapes" the engine should handle well.
//
// Resume-safe / idempotent: synthetic users are clearly named and
// always cleaned up in a finally block. Cost: $0 (no Anthropic calls;
// just DB + ml package).
//
// Run: pnpm dlx tsx --env-file=.env.local scripts/validate-rec-profiles.ts

import { neon } from '@neondatabase/serverless';
import { recomputeUserRecommendations } from '../src/inngest/functions/recommend';

const sql = neon(process.env.DATABASE_URL!);

interface ProfileSpec {
  readonly label: string;
  /** Titles the synthetic user rates. Looked up by exact title (case-
   * insensitive). Each title gets the rating below. */
  readonly ratings: ReadonlyArray<{ title: string; rating: number }>;
  /** What we expect the rec engine to surface, as a free-text hint for
   * the human eyeballing the output. Not asserted programmatically. */
  readonly hypothesis: string;
}

const PROFILES: ReadonlyArray<ProfileSpec> = [
  {
    label: 'aot-fan',
    ratings: [{ title: 'Attack on Titan', rating: 9 }],
    hypothesis:
      'expect dark / bleak / war-themed anime: Vinland Saga, Berserk, 86 EIGHTY-SIX, Code Geass, etc',
  },
  {
    label: 'opm-fan',
    ratings: [{ title: 'One-Punch Man', rating: 10 }],
    hypothesis:
      'expect action-with-deconstruction: Mob Psycho 100 (same author), maybe Demon Slayer, JJK',
  },
  {
    label: 'opm-and-eva-fan',
    ratings: [
      { title: 'One-Punch Man', rating: 10 },
      { title: 'Neon Genesis Evangelion', rating: 10 },
    ],
    hypothesis:
      'expect convergence on dark psychological + meta-aware works: Mob Psycho, FLCL, Madoka, Serial Experiments Lain',
  },
  {
    label: 'prestige-tv-fan',
    ratings: [
      { title: 'Breaking Bad', rating: 10 },
      { title: 'The Wire', rating: 10 },
      { title: 'Mad Men', rating: 9 },
    ],
    hypothesis:
      'EDGE CASE: these prestige titles were JUST added to catalog (no V4 descriptors). Tests whether V1 tags carry the load when V4 has no signal. Expect more prestige TV (Sopranos, Succession, BCS) via V1 tag overlap.',
  },
  {
    label: 'comedy-fan',
    ratings: [{ title: 'The Good Place', rating: 9 }],
    hypothesis:
      "expect warm ensemble comedies — Brooklyn Nine-Nine, Schitt's Creek; cross-medium if V4 fires",
  },
];

interface TitleRow {
  id: string;
  title: string;
}

interface RecItem {
  titleId: string;
  score: number;
  reasonHint: string | null;
}

async function lookupTitles(titles: ReadonlyArray<string>): Promise<Map<string, TitleRow>> {
  if (titles.length === 0) return new Map();
  const rows = (await sql`
    SELECT id, title FROM titles
    WHERE LOWER(title) = ANY(${titles.map((t) => t.toLowerCase())}::text[])
  `) as TitleRow[];
  const map = new Map<string, TitleRow>();
  for (const r of rows) {
    if (!map.has(r.title.toLowerCase())) map.set(r.title.toLowerCase(), r);
  }
  return map;
}

async function setupSyntheticUser(profile: ProfileSpec): Promise<{
  userId: string;
  resolvedRatings: Array<{ titleId: string; title: string; rating: number }>;
}> {
  const titleMap = await lookupTitles(profile.ratings.map((r) => r.title));
  const resolved: Array<{ titleId: string; title: string; rating: number }> = [];
  for (const r of profile.ratings) {
    const t = titleMap.get(r.title.toLowerCase());
    if (!t) {
      console.log(`  ⚠ NOT FOUND in catalog: ${r.title} (will be skipped)`);
      continue;
    }
    resolved.push({ titleId: t.id, title: t.title, rating: r.rating });
  }
  if (resolved.length === 0) {
    throw new Error(`No catalog matches for any of profile "${profile.label}" titles`);
  }

  const clerkId = `validation_${profile.label}_${Date.now()}`;
  const userRows = (await sql`
    INSERT INTO users (clerk_id, region)
    VALUES (${clerkId}, 'GB')
    RETURNING id
  `) as Array<{ id: string }>;
  const userId = userRows[0]!.id;

  for (const r of resolved) {
    await sql`
      INSERT INTO watch_entries (user_id, title_id, kind, rating, status)
      VALUES (${userId}, ${r.titleId}, 'tracking', ${r.rating}, 'completed')
    `;
  }

  return { userId, resolvedRatings: resolved };
}

async function v4OverlapStats(userId: string): Promise<{
  ratedWithV4: number;
  totalRated: number;
  edgesOut: number;
  edgesIn: number;
}> {
  const ratedTotal = (await sql`
    SELECT COUNT(*)::int AS n FROM watch_entries
    WHERE user_id = ${userId} AND rating IS NOT NULL
  `) as Array<{ n: number }>;
  const v4 = (await sql`
    SELECT COUNT(DISTINCT td.title_id)::int AS n
    FROM watch_entries w
    JOIN title_descriptors td ON td.title_id = w.title_id
    WHERE w.user_id = ${userId} AND w.rating IS NOT NULL
  `) as Array<{ n: number }>;
  const edgesOut = (await sql`
    SELECT COUNT(*)::int AS n
    FROM title_comparable_titles tct
    JOIN watch_entries w ON w.title_id = tct.title_id
    WHERE w.user_id = ${userId} AND w.rating IS NOT NULL
      AND tct.referenced_title_id IS NOT NULL
  `) as Array<{ n: number }>;
  const edgesIn = (await sql`
    SELECT COUNT(*)::int AS n
    FROM title_comparable_titles tct
    JOIN watch_entries w ON w.title_id = tct.referenced_title_id
    WHERE w.user_id = ${userId} AND w.rating IS NOT NULL
      AND tct.referenced_title_id IS NOT NULL
  `) as Array<{ n: number }>;
  return {
    ratedWithV4: v4[0]?.n ?? 0,
    totalRated: ratedTotal[0]?.n ?? 0,
    edgesOut: edgesOut[0]?.n ?? 0,
    edgesIn: edgesIn[0]?.n ?? 0,
  };
}

async function topRecs(userId: string, n: number): Promise<RecItem[]> {
  const rows = (await sql`
    SELECT payload FROM user_recommendations WHERE user_id = ${userId}
  `) as Array<{ payload: { items: RecItem[] } }>;
  const items = rows[0]?.payload?.items ?? [];
  return items.slice(0, n);
}

async function fetchTitleNames(
  ids: ReadonlyArray<string>,
): Promise<Map<string, { title: string; mediaType: string; year: number | null }>> {
  if (ids.length === 0) return new Map();
  const rows = (await sql`
    SELECT id, title, media_type, release_year FROM titles WHERE id = ANY(${ids}::uuid[])
  `) as Array<{ id: string; title: string; media_type: string; release_year: number | null }>;
  return new Map(
    rows.map((r) => [r.id, { title: r.title, mediaType: r.media_type, year: r.release_year }]),
  );
}

async function cleanupUser(userId: string): Promise<void> {
  // ON DELETE CASCADE on watch_entries.user_id + user_recommendations.user_id
  // cleans the rest. Verify cascades are configured first if this is run
  // in an environment without them.
  await sql`DELETE FROM user_recommendations WHERE user_id = ${userId}`;
  await sql`DELETE FROM watch_entries WHERE user_id = ${userId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;
}

async function runProfile(profile: ProfileSpec): Promise<void> {
  console.log(`\n${'='.repeat(86)}`);
  console.log(`PROFILE: ${profile.label}`);
  console.log(`Hypothesis: ${profile.hypothesis}`);
  console.log(`Rated: ${profile.ratings.map((r) => `${r.title}@${r.rating}`).join(', ')}`);
  console.log(`${'='.repeat(86)}`);

  let userId: string | null = null;
  try {
    const { userId: id, resolvedRatings } = await setupSyntheticUser(profile);
    userId = id;
    console.log(`  resolved: ${resolvedRatings.map((r) => `${r.title}@${r.rating}`).join(', ')}`);

    const overlap = await v4OverlapStats(userId);
    console.log(
      `  V4 overlap: ${overlap.ratedWithV4}/${overlap.totalRated} rated have descriptors  edges out=${overlap.edgesOut} in=${overlap.edgesIn}`,
    );

    const t0 = Date.now();
    const result = await recomputeUserRecommendations(userId);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  recompute: ${dt}s, ${result.recCount} recs`);

    const top = await topRecs(userId, 10);
    const titleMap = await fetchTitleNames(top.map((r) => r.titleId));

    console.log(`\n  TOP 10:`);
    for (let i = 0; i < top.length; i += 1) {
      const r = top[i]!;
      const t = titleMap.get(r.titleId);
      console.log(
        `    ${(i + 1).toString().padStart(2)}. ${r.score.toFixed(3).padStart(8)}  ${t?.title ?? '?'} (${t?.mediaType ?? '?'}, ${t?.year ?? '?'})`,
      );
      if (r.reasonHint) console.log(`        hint: ${r.reasonHint}`);
    }
  } finally {
    if (userId) {
      try {
        await cleanupUser(userId);
      } catch (e) {
        console.log(`  ⚠ cleanup failed for ${userId}: ${e}`);
      }
    }
  }
}

async function cleanupStaleValidationUsers(): Promise<void> {
  // Defensive startup sweep — earlier crashed runs (e.g. the "tracked" vs
  // "tracking" enum mismatch) leave orphan rows because setupSyntheticUser
  // threw between user-INSERT and watch_entries-INSERT, before runProfile's
  // finally block could see the userId. Clean up any clerk_id matching
  // the synthetic prefix so re-runs don't accumulate.
  const stale = (await sql`
    SELECT id, clerk_id FROM users WHERE clerk_id LIKE 'validation_%'
  `) as Array<{ id: string; clerk_id: string }>;
  if (stale.length === 0) return;
  console.log(`Found ${stale.length} stale validation users from prior runs — cleaning up`);
  for (const u of stale) {
    await sql`DELETE FROM user_recommendations WHERE user_id = ${u.id}`;
    await sql`DELETE FROM watch_entries WHERE user_id = ${u.id}`;
    await sql`DELETE FROM users WHERE id = ${u.id}`;
  }
  console.log(`Cleaned up ${stale.length} stale users.\n`);
}

async function main(): Promise<void> {
  console.log(`Multi-profile rec validation`);
  console.log(`Started ${new Date().toISOString()}`);
  console.log(`Profiles: ${PROFILES.length}`);

  await cleanupStaleValidationUsers();

  for (const profile of PROFILES) {
    try {
      await runProfile(profile);
    } catch (e) {
      console.log(`\n  ✗ Profile "${profile.label}" failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`\n${'='.repeat(86)}`);
  console.log('Done. Synthetic users cleaned up.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
