// HelpME2C personal-recommendation scoring — the moat-adjacent pure logic.
//
// Two-step contract per packages/ml/CLAUDE.md:
//
//   1. extractTasteVector(history, userTitles) → UserTasteVector
//      Build a (tagId → aggregate weight) map from a user's anchor picks
//      and rated tracking entries plus the tag data for those titles.
//
//   2. recommendForUser(taste, candidates, limit, themeMembership?) → Recommendation[]
//      Score every candidate by tag-overlap against the taste vector,
//      plus optional cross-medium theme-overlap when membership data is
//      provided. Return the top-N ranked descending.
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

/**
 * One row in the cross-medium tag→theme bridge — see
 * apps/web/src/server/schema/themes.ts for the editorial rationale.
 *
 * `strength` is 0–100 (mirrors the DB column). 100 = full match, lower =
 * narrower / broader / loose-association membership.
 */
export interface TagThemeMembership {
  readonly tagId: string;
  readonly themeId: string;
  readonly strength: number;
}

/** A single scored recommendation. Score units are tag-weight²; only ranking matters. */
export interface Recommendation {
  readonly titleId: string;
  readonly score: number;
}

// Anchors contribute at full positive weight. Ratings are bipolar per
// ADR-0024: a 1-10 rating is mapped to a signed weight in [-1, +1] via
// `(rating - RATING_NEUTRAL) / RATING_HALF_SPAN`. The midpoint is 5.5
// (between "Mixed" 4-6 and "Liked" 7+) so rating 10 → +1.0 and rating
// 1 → -1.0 symmetrically. Low-rated titles' tags now subtract from the
// taste vector.
const ANCHOR_CONTRIBUTION = 1.0;
const RATING_NEUTRAL = 5.5;
const RATING_HALF_SPAN = 4.5;
const DEFAULT_LIMIT = 200;

/**
 * Build a user's taste vector from their anchor picks + rated tracking entries.
 *
 * Anchors contribute the full tag weights of their title (always positive).
 * Ratings contribute via the BIPOLAR formula per ADR-0024:
 *
 *   multiplier = (rating - 5.5) / 4.5
 *
 * which maps rating 1 → -1.0, rating 5/6 → ~neutral, rating 10 → +1.0.
 * A low-rated title's tags now SUBTRACT from the taste vector, actively
 * repelling future recommendations with similar themes.
 *
 * Multiple titles contributing the same tag accumulate via sum. The
 * resulting `tagWeights` map can have negative values; downstream
 * `scoreCandidate` interprets that as "candidates with this tag score
 * lower."
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
    // Bipolar mapping per ADR-0024 — see top-of-file constants.
    const multiplier = (rated.rating - RATING_NEUTRAL) / RATING_HALF_SPAN;
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
 * Two-part formula:
 *
 *   tagScore(c)   = Σ taste[tagId] × c.tag_weight
 *                     for tagId ∈ c.tags ∩ taste     (direct tag-overlap)
 *
 *   themeScore(c) = Σ tasteTheme[themeId] × c.tag_weight × strength/100
 *                     for c-tags NOT in taste, summed over their themes
 *                                                     (cross-medium bridge)
 *
 *   score(c)      = tagScore(c) + themeScore(c)
 *
 * Where `tasteTheme[themeId]` is built once at the top of this call by
 * walking the user's taste vector through `themeMembership` and
 * accumulating `taste[tagId] × strength/100` per theme.
 *
 * The cross-medium-only rule (theme score skipped when the candidate's
 * tag is already in the user's taste vector) is what makes themes a
 * BRIDGE rather than a multiplier. A user anchored on `tmdb:tragedy`
 * gets a theme boost on anime tagged `anilist:Tragedy` (different tag
 * row, same theme) but NOT on more TMDB shows tagged `tmdb:tragedy`
 * (those score via direct tag-overlap, no double-count). This is what
 * makes cross-medium recommendations actually emerge — see
 * apps/web/src/server/schema/themes.ts and packages/ml/src/themes/
 * mappings.ts for the editorial substrate.
 *
 * Backward compatibility: `themeMembership` defaults to empty. With
 * empty membership the function reduces exactly to the previous
 * tag-overlap-only formula — no behavior change for callers that
 * haven't started passing theme data. Existing tests pass unchanged.
 *
 * Tie-breaking: titleId ASC. Makes output deterministic given fixed
 * inputs — important for tests, debugging, and reproducible eval runs.
 *
 * Caller responsibilities:
 *   - Exclude titles already in the user's library from `candidates`
 *     (we don't want to recommend things they've already added)
 *   - Pre-fetch tag data for the candidate set
 *   - Pre-fetch tag→theme membership data if cross-medium is wanted;
 *     otherwise omit the param
 *   - Decide what to do with an empty taste vector (cold-start case) —
 *     this function will compute zero scores for everything and return a
 *     deterministic-but-meaningless ordering, so the caller should
 *     normally short-circuit before calling
 */
// Scoring kernel lives in ./scoring (single source of truth shared
// between recommendForUser, recommendForGroup, and explainGroupRecommendation).
import { buildTagThemeIndex, buildTasteTheme, scoreCandidate } from './scoring';

export function recommendForUser(
  taste: UserTasteVector,
  candidates: ReadonlyArray<TitleTagSet>,
  limit: number = DEFAULT_LIMIT,
  themeMembership: ReadonlyArray<TagThemeMembership> = [],
): Recommendation[] {
  const tagThemes = buildTagThemeIndex(themeMembership);
  const tasteTheme = buildTasteTheme(taste, tagThemes);

  const scored: Recommendation[] = [];
  for (const candidate of candidates) {
    scored.push({
      titleId: candidate.titleId,
      score: scoreCandidate(taste, candidate, tagThemes, tasteTheme),
    });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.titleId.localeCompare(b.titleId);
  });

  return scored.slice(0, Math.max(0, limit));
}

// ---------------------------------------------------------------------------
// Group recommendations — per ADR-0020 (Average Without Misery + soft
// disagreement penalty + transparency layer). The algorithm:
//
//   For each candidate c, for each member m:
//     raw_m   = scoreCandidate(m.taste, c, ...)   // shared kernel
//     norm_m  = raw_m / max_over_candidates(raw_m)  // per-user 0..1 scale
//
//   if any norm_m < vetoThreshold:
//     excluded
//   else:
//     groupScore(c) = mean(norm) - lambda × stddev(norm)
//
// Per-user normalisation makes vetoThreshold interpretable (e.g. "0.5
// = exclude if any member's score is below half their personal best
// across this candidate set"). ADR-0020 spec'd `veto_threshold = 5/10`
// — a 0..1 scale matches that intent.
//
// Defaults from ADR-0020: vetoThreshold = 0.5, lambda = 0.5. These
// will be calibrated against the offline eval harness in the next chunk
// per the ADR's "required before any group-rec code lands" gate.
// ---------------------------------------------------------------------------

/** A user participating in a group rec session. Carries a userId so the
 * caller can correlate per-user scores back to display data. */
export interface GroupMember {
  readonly userId: string;
  readonly taste: UserTasteVector;
}

/** Tunable parameters for group scoring. See ADR-0020 §what-we-chose. */
export interface GroupScoreParams {
  /** 0..1, per-user-normalised score floor. If any member's normalised
   * score for a candidate is strictly below this, the candidate is
   * excluded. Default 0.5 per ADR-0020. */
  readonly vetoThreshold: number;
  /** Disagreement penalty coefficient. 0 = pure mean (utilitarian).
   * Higher = penalise divergence between members. Default 0.5 per
   * ADR-0020. */
  readonly lambda: number;
}

/** A scored group recommendation. `perUserScores` is normalised 0..1
 * per member so the caller can render the transparency layer
 * ("recommended for both because [member A: 0.82, member B: 0.71]"). */
export interface GroupRecommendation {
  readonly titleId: string;
  readonly groupScore: number;
  readonly perUserScores: ReadonlyMap<string, number>;
}

const DEFAULT_GROUP_PARAMS: GroupScoreParams = { vetoThreshold: 0.5, lambda: 0.5 };

/**
 * Score candidates against a group of users using AWM + disagreement
 * penalty per ADR-0020. Returns the top-N ranked candidates that pass
 * the per-user veto floor.
 *
 * Empty group or empty candidates → empty output.
 *
 * Two distinct "no signal" cases handled differently:
 *
 *   - **Cold-start member** (empty taste vector, `taste.size === 0`):
 *     contributes 0 to the per-user normalised score AND abstains from
 *     veto. They literally have no opinion to enforce. The other
 *     members drive ranking.
 *
 *   - **Has-taste-but-no-match** (non-empty taste, but `maxRaw === 0`
 *     across this candidate set): the member has preferences and none
 *     of these candidates appeal to them. Their normalised score is 0
 *     and they DO veto at any positive threshold. This is the
 *     mixed-medium failure mode ADR-0020 §what-would-change-our-mind
 *     anticipates — anime+TV couples without a theme bridge legitimately
 *     produce empty recs, prompting the cross-medium-mode UX.
 *
 * Tie-breaking: groupScore desc, then titleId asc. Deterministic for
 * fixed inputs — important for tests, eval harness, and reproducible
 * parameter sweeps.
 *
 * Caller responsibilities (same shape as recommendForUser):
 *   - Pre-fetch tag data for the candidate set
 *   - Pre-fetch tag→theme membership data if cross-medium is wanted
 *   - Exclude titles already in any member's library from `candidates`
 *     (we don't recommend things any member has already added — same
 *     contract as the single-user reader)
 *   - Decide what to do with an empty output (which can happen if every
 *     candidate is vetoed by some member — likely an "incompatible
 *     group" UX state)
 */
export function recommendForGroup(
  members: ReadonlyArray<GroupMember>,
  candidates: ReadonlyArray<TitleTagSet>,
  params: GroupScoreParams = DEFAULT_GROUP_PARAMS,
  themeMembership: ReadonlyArray<TagThemeMembership> = [],
  limit: number = DEFAULT_LIMIT,
): GroupRecommendation[] {
  if (members.length === 0 || candidates.length === 0) return [];

  const tagThemes = buildTagThemeIndex(themeMembership);

  // Precompute per-member: tasteTheme + raw score for every candidate +
  // per-member max raw score (for normalisation). One pass over
  // candidates per member. `isColdStart` distinguishes "no taste vector
  // yet" (true cold-start — abstain from veto) from "has taste, no
  // candidate matches" (the AWM mixed-medium failure mode per ADR-0020
  // §what-would-change-our-mind — should veto).
  const memberContexts = members.map((m) => {
    const tasteTheme = buildTasteTheme(m.taste, tagThemes);
    const rawScores = candidates.map((c) => scoreCandidate(m.taste, c, tagThemes, tasteTheme));
    let maxRaw = 0;
    for (const s of rawScores) {
      if (s > maxRaw) maxRaw = s;
    }
    const isColdStart = m.taste.size === 0;
    return { userId: m.userId, rawScores, maxRaw, isColdStart };
  });

  const scored: GroupRecommendation[] = [];
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i]!;
    const perUser = new Map<string, number>();
    const scoredNorms: number[] = [];
    let vetoed = false;
    for (const ctx of memberContexts) {
      // Cold-start guard — only TRUE cold-start (empty taste vector)
      // abstains. A member with a non-empty taste whose maxRaw=0 across
      // these candidates has expressed preferences and just doesn't like
      // anything offered: that IS a signal and should veto. This is the
      // AWM mixed-medium failure mode per ADR-0020 §what-would-change-
      // our-mind — anime+TV couples without a theme bridge legitimately
      // produce empty recs, prompting the cross-medium-mode UX rather
      // than silent acceptance.
      if (ctx.isColdStart) {
        perUser.set(ctx.userId, 0);
        continue;
      }
      const norm = ctx.maxRaw > 0 ? ctx.rawScores[i]! / ctx.maxRaw : 0;
      perUser.set(ctx.userId, norm);
      scoredNorms.push(norm);
      if (norm < params.vetoThreshold) {
        vetoed = true;
      }
    }
    if (vetoed) continue;

    // All members cold-start → no signal anywhere. Emit with score 0
    // rather than dropping; the harness can decide what to do with a
    // groupless cold-start group, and the deterministic ordering still
    // surfaces something rather than silently returning empty.
    if (scoredNorms.length === 0) {
      scored.push({ titleId: candidate.titleId, groupScore: 0, perUserScores: perUser });
      continue;
    }

    const mean = scoredNorms.reduce((a, b) => a + b, 0) / scoredNorms.length;
    let varSum = 0;
    for (const v of scoredNorms) {
      varSum += (v - mean) ** 2;
    }
    const stddev = Math.sqrt(varSum / scoredNorms.length);
    const groupScore = mean - params.lambda * stddev;

    scored.push({ titleId: candidate.titleId, groupScore, perUserScores: perUser });
  }

  scored.sort((a, b) => {
    if (a.groupScore !== b.groupScore) return b.groupScore - a.groupScore;
    return a.titleId.localeCompare(b.titleId);
  });

  return scored.slice(0, Math.max(0, limit));
}
