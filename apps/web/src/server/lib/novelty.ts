/**
 * Blend a sorted list by novelty preference.
 *
 * novelty=0 → pure score order (no curated bump)
 * novelty=1 → curated titles first, then popular remainder
 * in between → proportional mix
 *
 * The input list must already be sorted by descending score. We split into
 * curated / non-curated sub-lists, take the proportional share from each,
 * then interleave curated-first so they surface at the top when novelty > 0.
 */
export function blendByNovelty<T extends { isCurated: boolean }>(
  rows: T[],
  novelty: number,
  limit: number,
): T[] {
  if (novelty <= 0) return rows.slice(0, limit);
  const curated = rows.filter((r) => r.isCurated);
  const popular = rows.filter((r) => !r.isCurated);
  const idealCurated = Math.round(limit * novelty);
  // If there aren't enough curated titles, backfill with popular ones so
  // the result always fills `limit` (or total available, whichever is less).
  const actualCurated = Math.min(idealCurated, curated.length);
  const actualPopular = Math.min(limit - actualCurated, popular.length);
  const blended: T[] = [];
  const cQ = [...curated.slice(0, actualCurated)];
  const pQ = [...popular.slice(0, actualPopular)];
  while (blended.length < limit) {
    if (pQ.length) blended.push(pQ.shift()!);
    if (blended.length < limit && cQ.length) blended.push(cQ.shift()!);
    if (!pQ.length && !cQ.length) break;
  }
  return blended;
}
