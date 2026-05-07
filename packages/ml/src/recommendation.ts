// HelpME2C personal-recommendation scoring — the moat-adjacent pure logic.
//
// Two-step contract per packages/ml/CLAUDE.md:
//
//   1. extractTasteVector(history, userTitles) → UserTasteVector
//      Build a (tagId → aggregate weight) map from a user's anchor picks
//      and rated tracking entries plus the tag data for those titles.
//
//   2. recommendForUser(taste, candidates, limit) → Recommendation[]
//      Score every candidate by tag-overlap against the taste vector,
//      return the top-N ranked descending.
//
// The caller (apps/web's Inngest job — M4 commit 4) fetches the data from
// Postgres, drives both functions, and writes the result to the
// user_recommendations cache. This module knows nothing about Drizzle,
// tRPC, or HTTP — see packages/ml/CLAUDE.md for the boundary rules.

/** A single anchor pick — user has stated this title represents their taste. */
export interface AnchorPick {
  readonly titleId: string;
}

/** A tracked title with an explicit user rating. Rating is 1-10. */
export interface RatedTitle {
  readonly titleId: string;
  readonly rating: number;
}

/** A user's full taste signal: anchor picks + rated tracking entries. */
export interface UserHistory {
  readonly anchors: ReadonlyArray<AnchorPick>;
  readonly ratings: ReadonlyArray<RatedTitle>;
}

/** A single tag attached to a title with a weight (0-100, AniList rank scale). */
export interface TaggedTitleTag {
  readonly tagId: string;
  readonly weight: number;
}

/** A title plus its tag set — passed in for both user-history titles and candidates. */
export interface TitleTagSet {
  readonly titleId: string;
  readonly tags: ReadonlyArray<TaggedTitleTag>;
}

/** Aggregate per-tag weight contribution from a user's history. */
export type UserTasteVector = ReadonlyMap<string, number>;

/** A single scored recommendation. Score units are tag-weight²; only ranking matters. */
export interface Recommendation {
  readonly titleId: string;
  readonly score: number;
}

// Per the M4 plan agreed 2026-05-08: anchors contribute at full weight,
// ratings scale by rating/10 (10/10 = anchor-equivalent, 5/10 = half).
// "Organic ranking with ability to rerank later" — these constants are
// intentionally simple; tuning lives in a future commit, possibly via a
// reranking layer that wraps recommendForUser rather than by changing
// the constants here.
const ANCHOR_CONTRIBUTION = 1.0;
const MAX_RATING = 10;
const DEFAULT_LIMIT = 200;

/**
 * Build a user's taste vector from their anchor picks + rated tracking entries.
 *
 * Anchors contribute the full tag weights of their title; ratings contribute
 * scaled by `rating / 10`. Multiple titles contributing the same tag
 * accumulate via sum.
 *
 * Titles referenced in `history` that don't appear in `userTitles` are
 * silently ignored — the caller is responsible for fetching tag data for
 * every title in the user's history, and a missing entry just contributes
 * nothing rather than being a hard error. This means the function works
 * the same whether the missing title is genuinely tag-less or just not
 * loaded.
 *
 * The vector is NOT length-normalised. A user with 5 anchor picks ends up
 * with a higher-magnitude vector than a user with 1; downstream scoring
 * naturally treats them differently — more history, stronger preferences.
 * Length-normalisation could be added as a separate step if cosine
 * similarity becomes the desired metric.
 */
export function extractTasteVector(
  history: UserHistory,
  userTitles: ReadonlyArray<TitleTagSet>,
): UserTasteVector {
  const tagWeights = new Map<string, number>();
  const titlesById = new Map<string, TitleTagSet>();
  for (const title of userTitles) {
    titlesById.set(title.titleId, title);
  }

  for (const anchor of history.anchors) {
    const title = titlesById.get(anchor.titleId);
    if (!title) continue;
    for (const tag of title.tags) {
      tagWeights.set(
        tag.tagId,
        (tagWeights.get(tag.tagId) ?? 0) + tag.weight * ANCHOR_CONTRIBUTION,
      );
    }
  }

  for (const rated of history.ratings) {
    const title = titlesById.get(rated.titleId);
    if (!title) continue;
    const multiplier = rated.rating / MAX_RATING;
    for (const tag of title.tags) {
      tagWeights.set(tag.tagId, (tagWeights.get(tag.tagId) ?? 0) + tag.weight * multiplier);
    }
  }

  return tagWeights;
}

/**
 * Score candidate titles against a user's taste vector and return the
 * top-N ranked descending by score.
 *
 * Score formula:
 *
 *   score(c) = Σ taste[tagId] × c.tag_weight   for tagId ∈ c.tags ∩ taste
 *
 * Tie-breaking: titleId ASC. This makes the output deterministic given
 * fixed inputs — important for tests, debugging, and reproducible eval
 * runs against the same fixture data.
 *
 * Caller responsibilities:
 *   - Exclude titles already in the user's library from `candidates`
 *     (we don't want to recommend things they've already added)
 *   - Pre-fetch tag data for the candidate set
 *   - Decide what to do with an empty taste vector (cold-start case) —
 *     this function will compute zero scores for everything and return a
 *     deterministic-but-meaningless ordering, so the caller should
 *     normally short-circuit before calling
 */
export function recommendForUser(
  taste: UserTasteVector,
  candidates: ReadonlyArray<TitleTagSet>,
  limit: number = DEFAULT_LIMIT,
): Recommendation[] {
  const scored: Recommendation[] = [];
  for (const candidate of candidates) {
    let score = 0;
    for (const tag of candidate.tags) {
      const tasteWeight = taste.get(tag.tagId);
      if (tasteWeight === undefined) continue;
      score += tasteWeight * tag.weight;
    }
    scored.push({ titleId: candidate.titleId, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.titleId.localeCompare(b.titleId);
  });

  return scored.slice(0, Math.max(0, limit));
}
