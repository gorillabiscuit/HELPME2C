// Pure metric functions over a recommendForGroup output. All metrics
// take the algorithm's output + the candidate/theme data the algorithm
// scored against, and return numbers. Pure: same inputs → same output,
// no I/O, no global state.

import type { GroupRecommendation, TagThemeMembership, TitleTagSet } from '../recommendation';
import { ALL_HAPPY_THRESHOLD, type EvalMetrics } from './types';

/**
 * Compute eval metrics from a recommendForGroup output. Caller supplies
 * the full candidate set and theme membership so theme-diversity can be
 * computed against the SURVIVING (non-vetoed) top-N items.
 *
 * vetoCount is reported as `totalCandidates - vetoSurvivors`, where
 * vetoSurvivors is the count BEFORE the top-N slice (we infer this from
 * the limit and totalCandidates if the output reached the limit). For
 * an honest count, prefer running the algorithm with a high limit so
 * surviving candidates are fully visible.
 */
export function computeMetrics(
  output: ReadonlyArray<GroupRecommendation>,
  totalCandidates: number,
  candidates: ReadonlyArray<TitleTagSet>,
  themeMembership: ReadonlyArray<TagThemeMembership>,
): EvalMetrics {
  const topN = output.length;

  // vetoCount: if output reached the limit, we can't know how many
  // additional candidates survived but didn't make the cut. We treat
  // "vetoCount" as "candidates that did NOT make it into the output for
  // any reason" — combination of veto + below-cut. The harness convention
  // is to call with a generous limit so the distinction collapses.
  const vetoCount = totalCandidates - topN;

  if (topN === 0) {
    return {
      topN: 0,
      totalCandidates,
      vetoCount,
      meanScore: 0,
      minScore: 0,
      meanStddev: 0,
      allHappyCount: 0,
      themeDiversity: 0,
    };
  }

  // Flatten all per-user scores across all items to compute meanScore +
  // minScore. meanScore is the average across (item × member) pairs;
  // minScore is the worst single per-user score in the entire output.
  let scoreSum = 0;
  let scoreCount = 0;
  let minScore = Infinity;
  for (const rec of output) {
    for (const score of rec.perUserScores.values()) {
      scoreSum += score;
      scoreCount += 1;
      if (score < minScore) minScore = score;
    }
  }
  const meanScore = scoreCount > 0 ? scoreSum / scoreCount : 0;
  if (!Number.isFinite(minScore)) minScore = 0;

  // meanStddev: per-item stddev of perUserScores, averaged across items.
  // High value = algorithm is letting through items that please some
  // members much more than others (despite the lambda penalty).
  let stddevSum = 0;
  for (const rec of output) {
    const scores = Array.from(rec.perUserScores.values());
    if (scores.length === 0) continue;
    const itemMean = scores.reduce((a, b) => a + b, 0) / scores.length;
    let varSum = 0;
    for (const s of scores) varSum += (s - itemMean) ** 2;
    stddevSum += Math.sqrt(varSum / scores.length);
  }
  const meanStddev = topN > 0 ? stddevSum / topN : 0;

  // allHappyCount: items where EVERY member's normalised score >= 0.7
  // (the ADR-0020 "everyone genuinely likes it" bar).
  let allHappyCount = 0;
  for (const rec of output) {
    let allHappy = true;
    for (const score of rec.perUserScores.values()) {
      if (score < ALL_HAPPY_THRESHOLD) {
        allHappy = false;
        break;
      }
    }
    if (allHappy) allHappyCount += 1;
  }

  const themeDiversity = computeThemeDiversity(output, candidates, themeMembership);

  return {
    topN,
    totalCandidates,
    vetoCount,
    meanScore,
    minScore,
    meanStddev,
    allHappyCount,
    themeDiversity,
  };
}

/**
 * Internal — count distinct themes covered by the top-N output. A theme
 * is "covered" if any tag on any output item is a member of that theme.
 */
function computeThemeDiversity(
  output: ReadonlyArray<GroupRecommendation>,
  candidates: ReadonlyArray<TitleTagSet>,
  themeMembership: ReadonlyArray<TagThemeMembership>,
): number {
  if (output.length === 0) return 0;
  const candidatesById = new Map(candidates.map((c) => [c.titleId, c]));
  const tagToThemes = new Map<string, Set<string>>();
  for (const m of themeMembership) {
    let themes = tagToThemes.get(m.tagId);
    if (!themes) {
      themes = new Set();
      tagToThemes.set(m.tagId, themes);
    }
    themes.add(m.themeId);
  }

  const coveredThemes = new Set<string>();
  for (const rec of output) {
    const candidate = candidatesById.get(rec.titleId);
    if (!candidate) continue;
    for (const tag of candidate.tags) {
      const themes = tagToThemes.get(tag.tagId);
      if (!themes) continue;
      for (const themeId of themes) coveredThemes.add(themeId);
    }
  }
  return coveredThemes.size;
}
