import { describe, it, expect } from 'vitest';
import {
  extractTasteVector,
  recommendForUser,
  type TagThemeMembership,
  type TitleTagSet,
  type UserHistory,
  type UserTasteVector,
} from './recommendation';

// Fixture conventions:
//   - Tags `actionT`, `dramaT`, `mechaT`, `romanceT`, `thrillerT` are reused
//     across fixtures so behaviours can be reasoned about by-eye.
//   - Weights stay in the 0-100 AniList rank-scale band per the contract.
//   - Asserts target rankings (titleId order) per packages/ml/CLAUDE.md, not
//     absolute score numbers, except where a zero-vs-positive distinction is
//     intrinsic to the contract (cold-start, no-overlap candidate).

describe('extractTasteVector', () => {
  it('builds a map containing every tag from a single anchor with its source weight', () => {
    const userTitles: TitleTagSet[] = [
      {
        titleId: 't1',
        tags: [
          { tagId: 'actionT', weight: 80 },
          { tagId: 'dramaT', weight: 50 },
        ],
      },
    ];
    const history: UserHistory = {
      anchors: [{ titleId: 't1' }],
      ratings: [],
    };

    const taste = extractTasteVector(history, userTitles);

    expect(taste.get('actionT')).toBe(80);
    expect(taste.get('dramaT')).toBe(50);
  });

  it('treats a 10/10 rating as equivalent to an anchor pick on the same title', () => {
    const userTitles: TitleTagSet[] = [
      {
        titleId: 't1',
        tags: [
          { tagId: 'actionT', weight: 70 },
          { tagId: 'mechaT', weight: 40 },
        ],
      },
    ];
    const tasteFromAnchor = extractTasteVector(
      { anchors: [{ titleId: 't1' }], ratings: [] },
      userTitles,
    );
    const tasteFromTen = extractTasteVector(
      { anchors: [], ratings: [{ titleId: 't1', rating: 10 }] },
      userTitles,
    );

    expect(tasteFromTen.get('actionT')).toBe(tasteFromAnchor.get('actionT'));
    expect(tasteFromTen.get('mechaT')).toBe(tasteFromAnchor.get('mechaT'));
  });

  it('scales rating contributions linearly so a 5/10 contributes half of a 10/10', () => {
    const userTitles: TitleTagSet[] = [
      {
        titleId: 't1',
        tags: [{ tagId: 'actionT', weight: 80 }],
      },
    ];
    const tasteHigh = extractTasteVector(
      { anchors: [], ratings: [{ titleId: 't1', rating: 10 }] },
      userTitles,
    );
    const tasteLow = extractTasteVector(
      { anchors: [], ratings: [{ titleId: 't1', rating: 5 }] },
      userTitles,
    );

    const high = tasteHigh.get('actionT') ?? 0;
    const low = tasteLow.get('actionT') ?? 0;
    expect(low).toBeGreaterThan(0);
    expect(low).toBeLessThan(high);
    // 5/10 should be exactly half of 10/10 per the linear contract.
    expect(low * 2).toBeCloseTo(high, 10);
  });

  it('accumulates shared-tag weight across two anchor picks via sum', () => {
    const userTitles: TitleTagSet[] = [
      {
        titleId: 't1',
        tags: [{ tagId: 'actionT', weight: 50 }],
      },
      {
        titleId: 't2',
        tags: [{ tagId: 'actionT', weight: 80 }],
      },
    ];
    const taste = extractTasteVector(
      { anchors: [{ titleId: 't1' }, { titleId: 't2' }], ratings: [] },
      userTitles,
    );

    const accumulated = taste.get('actionT') ?? 0;
    // Sum-aggregation: combined > either individual contribution.
    expect(accumulated).toBeGreaterThan(50);
    expect(accumulated).toBeGreaterThan(80);
  });

  it('silently ignores history entries whose title is missing from userTitles', () => {
    const userTitles: TitleTagSet[] = [
      {
        titleId: 't1',
        tags: [{ tagId: 'actionT', weight: 60 }],
      },
    ];

    // 'tMissing' is referenced by the user but absent from userTitles —
    // function must not throw and must skip its contribution.
    const run = (): UserTasteVector =>
      extractTasteVector(
        {
          anchors: [{ titleId: 't1' }, { titleId: 'tMissing' }],
          ratings: [{ titleId: 'tAlsoMissing', rating: 9 }],
        },
        userTitles,
      );

    expect(run).not.toThrow();
    const taste = run();
    expect(taste.get('actionT')).toBe(60);
  });

  it('returns an empty vector for empty history and empty userTitles', () => {
    const taste = extractTasteVector({ anchors: [], ratings: [] }, []);
    expect(taste.size).toBe(0);
  });

  it('combines anchor and rating contributions for the same title additively', () => {
    const userTitles: TitleTagSet[] = [
      {
        titleId: 't1',
        tags: [{ tagId: 'actionT', weight: 100 }],
      },
    ];

    const tasteAnchorOnly = extractTasteVector(
      { anchors: [{ titleId: 't1' }], ratings: [] },
      userTitles,
    );
    const tasteAnchorPlusRating = extractTasteVector(
      {
        anchors: [{ titleId: 't1' }],
        ratings: [{ titleId: 't1', rating: 8 }],
      },
      userTitles,
    );

    const anchorOnly = tasteAnchorOnly.get('actionT') ?? 0;
    const both = tasteAnchorPlusRating.get('actionT') ?? 0;
    // Combined = anchor (1.0) + rating (0.8) → strictly larger than anchor alone.
    expect(both).toBeGreaterThan(anchorOnly);
  });
});

describe('recommendForUser', () => {
  const taste: UserTasteVector = new Map<string, number>([
    ['actionT', 100],
    ['mechaT', 80],
    ['dramaT', 30],
  ]);

  it('ranks a candidate sharing all high-weight tags above one sharing only some', () => {
    const candidates: TitleTagSet[] = [
      {
        titleId: 'allOverlap',
        tags: [
          { tagId: 'actionT', weight: 80 },
          { tagId: 'mechaT', weight: 70 },
          { tagId: 'dramaT', weight: 40 },
        ],
      },
      {
        titleId: 'partialOverlap',
        tags: [{ tagId: 'dramaT', weight: 80 }],
      },
    ];

    const result = recommendForUser(taste, candidates);

    expect(result[0]?.titleId).toBe('allOverlap');
    expect(result[1]?.titleId).toBe('partialOverlap');
  });

  it('ranks a zero-overlap candidate below any candidate with overlap', () => {
    const candidates: TitleTagSet[] = [
      {
        titleId: 'overlap',
        tags: [{ tagId: 'actionT', weight: 50 }],
      },
      {
        titleId: 'zeroOverlap',
        tags: [
          { tagId: 'romanceT', weight: 90 },
          { tagId: 'thrillerT', weight: 60 },
        ],
      },
    ];

    const result = recommendForUser(taste, candidates);
    const zero = result.find((r) => r.titleId === 'zeroOverlap');
    const overlap = result.find((r) => r.titleId === 'overlap');

    expect(zero).toBeDefined();
    expect(overlap).toBeDefined();
    expect(zero?.score).toBe(0);
    expect((overlap?.score ?? 0) > (zero?.score ?? 0)).toBe(true);
  });

  it('produces the same ordering across repeated calls with identical inputs', () => {
    const candidates: TitleTagSet[] = [
      { titleId: 'b', tags: [{ tagId: 'actionT', weight: 50 }] },
      { titleId: 'a', tags: [{ tagId: 'actionT', weight: 50 }] },
      { titleId: 'c', tags: [{ tagId: 'mechaT', weight: 70 }] },
      { titleId: 'd', tags: [{ tagId: 'dramaT', weight: 30 }] },
    ];

    const first = recommendForUser(taste, candidates).map((r) => r.titleId);
    const second = recommendForUser(taste, candidates).map((r) => r.titleId);

    expect(second).toEqual(first);
  });

  it('caps the returned length at the explicit limit argument', () => {
    const candidates: TitleTagSet[] = Array.from({ length: 100 }, (_, i) => ({
      titleId: `t${String(i).padStart(3, '0')}`,
      tags: [{ tagId: 'actionT', weight: (i % 50) + 1 }],
    }));

    const result = recommendForUser(taste, candidates, 10);

    expect(result.length).toBe(10);
  });

  it('defaults to a 200-item cap when limit is omitted', () => {
    const candidates: TitleTagSet[] = Array.from({ length: 250 }, (_, i) => ({
      titleId: `t${String(i).padStart(4, '0')}`,
      tags: [{ tagId: 'actionT', weight: (i % 50) + 1 }],
    }));

    const result = recommendForUser(taste, candidates);

    expect(result.length).toBe(200);
  });

  it('returns an empty array when the limit is zero', () => {
    const candidates: TitleTagSet[] = [
      { titleId: 'a', tags: [{ tagId: 'actionT', weight: 50 }] },
      { titleId: 'b', tags: [{ tagId: 'mechaT', weight: 50 }] },
    ];

    expect(recommendForUser(taste, candidates, 0)).toEqual([]);
  });

  it('returns an empty array when the limit is negative', () => {
    const candidates: TitleTagSet[] = [
      { titleId: 'a', tags: [{ tagId: 'actionT', weight: 50 }] },
      { titleId: 'b', tags: [{ tagId: 'mechaT', weight: 50 }] },
    ];

    expect(recommendForUser(taste, candidates, -5)).toEqual([]);
  });

  it('handles cold-start (empty taste) without throwing and orders by titleId ASC', () => {
    const emptyTaste: UserTasteVector = new Map<string, number>();
    const candidates: TitleTagSet[] = [
      { titleId: 'gamma', tags: [{ tagId: 'actionT', weight: 50 }] },
      { titleId: 'alpha', tags: [{ tagId: 'mechaT', weight: 50 }] },
      { titleId: 'beta', tags: [{ tagId: 'dramaT', weight: 50 }] },
    ];

    const run = (): ReturnType<typeof recommendForUser> =>
      recommendForUser(emptyTaste, candidates, 5);

    expect(run).not.toThrow();
    const result = run();
    expect(result.map((r) => r.titleId)).toEqual(['alpha', 'beta', 'gamma']);
    expect(result.every((r) => r.score === 0)).toBe(true);
  });

  it('returns an empty array when the candidate set is empty', () => {
    expect(recommendForUser(taste, [])).toEqual([]);
  });

  it('breaks score ties deterministically by titleId ASC regardless of input order', () => {
    // Two candidates with identical tag set → identical score → tie-break by id.
    const tieTags = [{ tagId: 'actionT', weight: 50 }];

    const orderA: TitleTagSet[] = [
      { titleId: 'zebra', tags: tieTags },
      { titleId: 'apple', tags: tieTags },
    ];
    const orderB: TitleTagSet[] = [
      { titleId: 'apple', tags: tieTags },
      { titleId: 'zebra', tags: tieTags },
    ];

    const resA = recommendForUser(taste, orderA).map((r) => r.titleId);
    const resB = recommendForUser(taste, orderB).map((r) => r.titleId);

    expect(resA).toEqual(['apple', 'zebra']);
    expect(resB).toEqual(['apple', 'zebra']);
  });

  it('ignores candidate tags absent from the taste vector when ranking', () => {
    // 'sharedOnly' has only one tag (actionT) which IS in taste.
    // 'sharedPlusNoise' has the same actionT tag PLUS noise tags absent from
    // taste — those must contribute nothing, so the two should tie and
    // tie-break by titleId ASC.
    const candidates: TitleTagSet[] = [
      {
        titleId: 'sharedPlusNoise',
        tags: [
          { tagId: 'actionT', weight: 60 },
          { tagId: 'romanceT', weight: 90 },
          { tagId: 'thrillerT', weight: 90 },
        ],
      },
      {
        titleId: 'sharedOnly',
        tags: [{ tagId: 'actionT', weight: 60 }],
      },
    ];

    const result = recommendForUser(taste, candidates);

    expect(result[0]?.score).toBe(result[1]?.score);
    expect(result.map((r) => r.titleId)).toEqual(['sharedOnly', 'sharedPlusNoise']);
  });
});

describe('recommendForUser — theme-overlap dimension', () => {
  // Fixture conventions for this block:
  //   - Tag IDs are namespaced by source where it matters for the cross-medium
  //     story (e.g. `tmdb:tragedy` vs `anilist:Tragedy`) so the bridge
  //     intent is legible. Other tags keep the short style of the block above.
  //   - Theme IDs use kebab-case slugs to mirror the editorial schema in
  //     apps/web/src/server/schema/themes.ts.
  //   - Asserts target rankings; absolute scores are only checked where the
  //     contract pins a zero (e.g. no contribution at all).

  it('produces identical output to the no-themes call when themeMembership is omitted vs explicitly empty', () => {
    // Defensive backward-compat lock: the explicit-empty form must be a
    // perfect synonym for the omitted form. Same fixture as the existing
    // base-case tests, run twice with two argument shapes.
    const taste: UserTasteVector = new Map<string, number>([
      ['actionT', 100],
      ['mechaT', 80],
    ]);
    const candidates: TitleTagSet[] = [
      {
        titleId: 'mostlyOverlap',
        tags: [
          { tagId: 'actionT', weight: 70 },
          { tagId: 'mechaT', weight: 60 },
        ],
      },
      {
        titleId: 'someOverlap',
        tags: [{ tagId: 'actionT', weight: 50 }],
      },
      {
        titleId: 'noOverlap',
        tags: [{ tagId: 'romanceT', weight: 90 }],
      },
    ];

    const omitted = recommendForUser(taste, candidates);
    const explicitEmpty = recommendForUser(taste, candidates, undefined, []);

    expect(explicitEmpty).toEqual(omitted);
  });

  it('places a candidate that bridges via theme above one with no overlap at all', () => {
    // The headline cross-medium scenario from the JSDoc: user's taste is
    // anchored on a TMDB tragedy tag; one candidate carries the AniList
    // tragedy tag (different tagId, NOT in taste) and bridges through the
    // shared `tragedy` theme; another candidate is unrelated. Bridge wins.
    const taste: UserTasteVector = new Map<string, number>([['tmdb:tragedy', 100]]);
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:Tragedy', themeId: 'tragedy', strength: 100 },
    ];
    const candidates: TitleTagSet[] = [
      {
        titleId: 'crossMediumBridge',
        tags: [{ tagId: 'anilist:Tragedy', weight: 80 }],
      },
      {
        titleId: 'unrelatedAnime',
        tags: [{ tagId: 'anilist:CookingShow', weight: 80 }],
      },
    ];

    const result = recommendForUser(taste, candidates, undefined, themeMembership);

    expect(result[0]?.titleId).toBe('crossMediumBridge');
    expect(result[1]?.titleId).toBe('unrelatedAnime');
    expect(result[1]?.score).toBe(0);
  });

  it('does NOT add theme contribution for a candidate tag that the user already has in taste', () => {
    // Cross-medium-only rule, part 1: when the candidate's tag IS in the
    // user's taste, that tag scores via direct tag-overlap only. The theme
    // dimension does NOT fire for it. We assert this by comparing the
    // direct-only tally to the theme-call tally — they must be equal.
    //
    // Setup: user's only taste signal is `tmdb:tragedy`. The candidate's
    // only tag is also `tmdb:tragedy`. Theme membership maps tmdb:tragedy
    // into a `tragedy` theme. If the implementation double-counted, the
    // theme call would yield a higher score; the rule forbids that.
    const taste: UserTasteVector = new Map<string, number>([['tmdb:tragedy', 100]]);
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
    ];
    const candidates: TitleTagSet[] = [
      {
        titleId: 'sameMediumSameTag',
        tags: [{ tagId: 'tmdb:tragedy', weight: 60 }],
      },
    ];

    const withoutThemes = recommendForUser(taste, candidates);
    const withThemes = recommendForUser(taste, candidates, undefined, themeMembership);

    expect(withThemes[0]?.score).toBe(withoutThemes[0]?.score);
  });

  it('keeps ranking unchanged with themeMembership when every candidate tag is already in the user taste', () => {
    // Cross-medium-only rule, part 2: with every candidate tag directly in
    // taste, the theme dimension contributes nothing for any of them, so
    // the ranking with themeMembership === the ranking without it.
    const taste: UserTasteVector = new Map<string, number>([
      ['actionT', 100],
      ['mechaT', 80],
      ['dramaT', 30],
    ]);
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'actionT', themeId: 'high-stakes-action', strength: 100 },
      { tagId: 'mechaT', themeId: 'high-stakes-action', strength: 100 },
      { tagId: 'dramaT', themeId: 'human-drama', strength: 100 },
    ];
    const candidates: TitleTagSet[] = [
      {
        titleId: 'allOverlap',
        tags: [
          { tagId: 'actionT', weight: 80 },
          { tagId: 'mechaT', weight: 70 },
          { tagId: 'dramaT', weight: 40 },
        ],
      },
      {
        titleId: 'partialOverlap',
        tags: [{ tagId: 'dramaT', weight: 80 }],
      },
    ];

    const withoutThemes = recommendForUser(taste, candidates).map((r) => r.titleId);
    const withThemes = recommendForUser(taste, candidates, undefined, themeMembership).map(
      (r) => r.titleId,
    );

    expect(withThemes).toEqual(withoutThemes);
  });

  it('lets a tag in user taste that is NOT in any theme still score via direct tag-overlap on candidates', () => {
    // A tag with no theme membership is still a first-class taste signal —
    // it just contributes via the tag-overlap dimension only. The candidate
    // sharing it must rank above one that doesn't.
    const taste: UserTasteVector = new Map<string, number>([['orphanT', 100]]);
    // Theme map covers OTHER tags; orphanT is intentionally absent.
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'someOtherT', themeId: 'whatever', strength: 100 },
    ];
    const candidates: TitleTagSet[] = [
      {
        titleId: 'sharesOrphan',
        tags: [{ tagId: 'orphanT', weight: 60 }],
      },
      {
        titleId: 'sharesNothing',
        tags: [{ tagId: 'unrelatedT', weight: 90 }],
      },
    ];

    const result = recommendForUser(taste, candidates, undefined, themeMembership);

    expect(result[0]?.titleId).toBe('sharesOrphan');
    expect(result[1]?.titleId).toBe('sharesNothing');
    expect(result[1]?.score).toBe(0);
  });

  it('ranks a strength-100 bridge candidate above a strength-50 bridge candidate, all else equal', () => {
    // Strength scaling: holding everything else constant — same taste, same
    // candidate-tag-weight, same theme — the candidate whose bridge tag has
    // strength 100 to the theme should outrank the one with strength 50.
    //
    // Note: strength applies on BOTH sides per the JSDoc (taste→theme AND
    // theme→candidate). To isolate the candidate-side scaling cleanly, the
    // user-side anchor uses a single strength-100 mapping; only the
    // candidate-side strengths differ between the two bridge tags.
    const taste: UserTasteVector = new Map<string, number>([['tmdb:tragedy', 100]]);
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:FullTragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:HalfTragedy', themeId: 'tragedy', strength: 50 },
    ];
    const candidates: TitleTagSet[] = [
      {
        titleId: 'halfStrengthBridge',
        tags: [{ tagId: 'anilist:HalfTragedy', weight: 80 }],
      },
      {
        titleId: 'fullStrengthBridge',
        tags: [{ tagId: 'anilist:FullTragedy', weight: 80 }],
      },
    ];

    const result = recommendForUser(taste, candidates, undefined, themeMembership);

    expect(result[0]?.titleId).toBe('fullStrengthBridge');
    expect(result[1]?.titleId).toBe('halfStrengthBridge');
  });

  it('accumulates contribution from a multi-theme tag across all themes that have user signal', () => {
    // The user has signal in TWO different themes via two different anchor
    // tags. One candidate's bridge tag belongs to BOTH themes; the other
    // candidate's bridge tag belongs to only ONE of them, with everything
    // else (taste weight on the user side, candidate tag weight, strengths)
    // matched. The double-themed candidate must rank higher.
    const taste: UserTasteVector = new Map<string, number>([
      ['tmdb:tragedy', 100],
      ['tmdb:antihero', 100],
    ]);
    const themeMembership: TagThemeMembership[] = [
      // User-side anchors → themes.
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'tmdb:antihero', themeId: 'antihero', strength: 100 },
      // Candidate-side bridge tag in BOTH themes.
      { tagId: 'anilist:DoubleBridge', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:DoubleBridge', themeId: 'antihero', strength: 100 },
      // Candidate-side bridge tag in ONLY ONE theme.
      { tagId: 'anilist:SingleBridge', themeId: 'tragedy', strength: 100 },
    ];
    const candidates: TitleTagSet[] = [
      {
        titleId: 'singleThemeBridge',
        tags: [{ tagId: 'anilist:SingleBridge', weight: 80 }],
      },
      {
        titleId: 'doubleThemeBridge',
        tags: [{ tagId: 'anilist:DoubleBridge', weight: 80 }],
      },
    ];

    const result = recommendForUser(taste, candidates, undefined, themeMembership);

    expect(result[0]?.titleId).toBe('doubleThemeBridge');
    expect(result[1]?.titleId).toBe('singleThemeBridge');
  });

  it('contributes zero from a theme whose candidate-side strength is 0, even when user has signal in that theme', () => {
    // A strength-0 mapping is unusual but the math should treat it as
    // "this tag does not really belong to this theme". One candidate
    // bridges via a strength-0 link to a theme the user cares about; an
    // identical candidate carries an unrelated tag. The two should TIE
    // (both score 0 from theme dimension and 0 from tag-overlap), then
    // tie-break by titleId ASC.
    const taste: UserTasteVector = new Map<string, number>([['tmdb:tragedy', 100]]);
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      // Candidate-side bridge with strength=0 → contributes nothing.
      { tagId: 'anilist:ZeroBridge', themeId: 'tragedy', strength: 0 },
    ];
    const candidates: TitleTagSet[] = [
      {
        titleId: 'zStrengthZeroBridge',
        tags: [{ tagId: 'anilist:ZeroBridge', weight: 80 }],
      },
      {
        titleId: 'aUnrelated',
        tags: [{ tagId: 'anilist:CookingShow', weight: 80 }],
      },
    ];

    const result = recommendForUser(taste, candidates, undefined, themeMembership);

    expect(result[0]?.score).toBe(0);
    expect(result[1]?.score).toBe(0);
    // Tie-break by titleId ASC; 'a...' precedes 'z...'.
    expect(result.map((r) => r.titleId)).toEqual(['aUnrelated', 'zStrengthZeroBridge']);
  });

  it('contributes zero from the theme dimension when the taste vector is empty', () => {
    // Cold-start with theme membership: no taste signal means tasteTheme
    // is empty for every theme, so no candidate gets a positive score via
    // the bridge — everything ties at 0 and orders by titleId ASC.
    const emptyTaste: UserTasteVector = new Map<string, number>();
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:Tragedy', themeId: 'tragedy', strength: 100 },
    ];
    const candidates: TitleTagSet[] = [
      {
        titleId: 'gamma',
        tags: [{ tagId: 'anilist:Tragedy', weight: 80 }],
      },
      {
        titleId: 'alpha',
        tags: [{ tagId: 'anilist:Tragedy', weight: 80 }],
      },
      {
        titleId: 'beta',
        tags: [{ tagId: 'anilist:CookingShow', weight: 80 }],
      },
    ];

    const result = recommendForUser(emptyTaste, candidates, undefined, themeMembership);

    expect(result.every((r) => r.score === 0)).toBe(true);
    expect(result.map((r) => r.titleId)).toEqual(['alpha', 'beta', 'gamma']);
  });
});
