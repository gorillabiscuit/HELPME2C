import { describe, it, expect } from 'vitest';
import {
  extractTasteVector,
  recommendForGroup,
  recommendForUser,
  type GroupMember,
  type GroupScoreParams,
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

describe('recommendForGroup', () => {
  // Fixture conventions for this block:
  //   - Members carry stable userIds (`alice`, `bob`, `carol`, ...) so per-user
  //     score assertions stay legible.
  //   - Where a "compatible" / "incompatible" framing matters, taste vectors
  //     are constructed by hand (not via extractTasteVector) so the test
  //     pinpoints group-aggregation behaviour rather than vector extraction.
  //   - Asserts target rankings + relative directions of groupScore (per
  //     packages/ml/CLAUDE.md). Absolute groupScore numbers are checked only
  //     where the contract pins a value (perUserScores 0..1 normalisation;
  //     identical-mean tie-break with lambda=0).

  const taste = (entries: ReadonlyArray<readonly [string, number]>): UserTasteVector =>
    new Map<string, number>(entries);

  it('returns an empty array for an empty group', () => {
    const candidates: TitleTagSet[] = [{ titleId: 't1', tags: [{ tagId: 'actionT', weight: 80 }] }];
    expect(recommendForGroup([], candidates)).toEqual([]);
  });

  it('returns an empty array when the candidate set is empty', () => {
    const members: GroupMember[] = [{ userId: 'alice', taste: taste([['actionT', 100]]) }];
    expect(recommendForGroup(members, [])).toEqual([]);
  });

  it('returns an empty array when both group and candidates are empty', () => {
    expect(recommendForGroup([], [])).toEqual([]);
  });

  it('produces the same ranking as recommendForUser for a single-member group with permissive params', () => {
    // Single-member group with vetoThreshold=0 and lambda=0 — same kernel,
    // same data. Per-user normalisation is monotonic, so it preserves the
    // descending order recommendForUser produces. Tie-break is also titleId
    // ASC in both, so the full sequence must match.
    const userTaste = taste([
      ['actionT', 100],
      ['mechaT', 80],
      ['dramaT', 30],
    ]);
    const candidates: TitleTagSet[] = [
      {
        titleId: 'allOverlap',
        tags: [
          { tagId: 'actionT', weight: 80 },
          { tagId: 'mechaT', weight: 70 },
          { tagId: 'dramaT', weight: 40 },
        ],
      },
      { titleId: 'partialOverlap', tags: [{ tagId: 'dramaT', weight: 80 }] },
      { titleId: 'noOverlap', tags: [{ tagId: 'romanceT', weight: 90 }] },
    ];
    const params: GroupScoreParams = { vetoThreshold: 0, lambda: 0 };

    const userOrder = recommendForUser(userTaste, candidates).map((r) => r.titleId);
    const groupOrder = recommendForGroup(
      [{ userId: 'alice', taste: userTaste }],
      candidates,
      params,
    ).map((r) => r.titleId);

    expect(groupOrder).toEqual(userOrder);
  });

  it('ranks high-overlap candidates at the top for a compatible couple sharing tag preferences', () => {
    // Both members have action+mecha taste; one candidate hits both, another
    // hits neither. The double-overlap candidate must rank top.
    const members: GroupMember[] = [
      {
        userId: 'alice',
        taste: taste([
          ['actionT', 100],
          ['mechaT', 80],
        ]),
      },
      {
        userId: 'bob',
        taste: taste([
          ['actionT', 90],
          ['mechaT', 70],
        ]),
      },
    ];
    const candidates: TitleTagSet[] = [
      {
        titleId: 'forBoth',
        tags: [
          { tagId: 'actionT', weight: 80 },
          { tagId: 'mechaT', weight: 70 },
        ],
      },
      {
        titleId: 'forNeither',
        tags: [{ tagId: 'romanceT', weight: 80 }],
      },
    ];
    // vetoThreshold=0 so the "for neither" candidate isn't filtered out and
    // we can read the relative ranking directly.
    const result = recommendForGroup(members, candidates, { vetoThreshold: 0, lambda: 0 });

    expect(result[0]?.titleId).toBe('forBoth');
    expect(result[1]?.titleId).toBe('forNeither');
  });

  it("vetoes a candidate when one member's normalised score is below the threshold", () => {
    // Alice's only signal is actionT; Bob's only signal is romanceT. The
    // candidate `forAliceOnly` scores high for Alice (her personal max) and
    // zero for Bob — Bob's normalised score is 0, well below 0.5, so it must
    // be excluded.
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      { userId: 'bob', taste: taste([['romanceT', 100]]) },
    ];
    const candidates: TitleTagSet[] = [
      { titleId: 'forAliceOnly', tags: [{ tagId: 'actionT', weight: 80 }] },
      { titleId: 'forBobOnly', tags: [{ tagId: 'romanceT', weight: 80 }] },
    ];

    const result = recommendForGroup(members, candidates, { vetoThreshold: 0.5, lambda: 0 });
    const ids = result.map((r) => r.titleId);

    expect(ids).not.toContain('forAliceOnly');
    expect(ids).not.toContain('forBobOnly');
    expect(result).toEqual([]);
  });

  it('includes the same one-sided candidate when vetoThreshold is 0', () => {
    // Same members and candidates as the veto test above, but with
    // vetoThreshold=0 the one-sided picks survive (bob's norm=0 is not
    // strictly less than 0).
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      { userId: 'bob', taste: taste([['romanceT', 100]]) },
    ];
    const candidates: TitleTagSet[] = [
      { titleId: 'forAliceOnly', tags: [{ tagId: 'actionT', weight: 80 }] },
      { titleId: 'forBobOnly', tags: [{ tagId: 'romanceT', weight: 80 }] },
    ];

    const result = recommendForGroup(members, candidates, { vetoThreshold: 0, lambda: 0 });
    const ids = result.map((r) => r.titleId);

    expect(ids).toContain('forAliceOnly');
    expect(ids).toContain('forBobOnly');
    expect(result.length).toBe(2);
  });

  it('penalises divergent candidates over uniform candidates with the same mean when lambda > 0', () => {
    // Two candidates contrived to have an identical mean across two members
    // but different stddev. The uniform one (low stddev) ranks above the
    // polarising one (high stddev) when lambda > 0.
    //
    // Members: alice signals actionT only; bob signals dramaT only.
    // Candidate A (`uniform`)  has equal-weight actionT + dramaT → both
    //   members score symmetrically; their per-user norms are equal → low
    //   stddev.
    // Candidate B (`polar`) has actionT only at the same weight → alice's
    //   norm = 1, bob's norm = 0 (in absolute), but to keep means equal we
    //   need a third candidate. We use a setup where each member's max-raw
    //   anchors normalisation: add `aliceMax` (actionT-heavy) and `bobMax`
    //   (dramaT-heavy) as extra candidates so the personal maxes are pinned
    //   to those, and `uniform` / `polar` take normalised positions
    //   orthogonally. Concretely:
    //   - alice's max raw = aliceMax (weight 100 actionT × 100 taste)
    //   - bob's   max raw = bobMax (weight 100 dramaT × 100 taste)
    //   - uniform: actionT+dramaT, weight 50 each → alice norm = 0.5,
    //                                                bob norm = 0.5
    //   - polar:   actionT weight 100, no dramaT  → alice norm = 1.0,
    //                                                bob norm = 0
    //   Means: uniform = 0.5, polar = 0.5 → equal. stddev: uniform = 0,
    //   polar = 0.5. With lambda > 0, uniform > polar.
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      { userId: 'bob', taste: taste([['dramaT', 100]]) },
    ];
    const candidates: TitleTagSet[] = [
      { titleId: 'aliceMax', tags: [{ tagId: 'actionT', weight: 100 }] },
      { titleId: 'bobMax', tags: [{ tagId: 'dramaT', weight: 100 }] },
      {
        titleId: 'uniform',
        tags: [
          { tagId: 'actionT', weight: 50 },
          { tagId: 'dramaT', weight: 50 },
        ],
      },
      { titleId: 'polar', tags: [{ tagId: 'actionT', weight: 100 }] },
    ];
    // vetoThreshold=0 so 'polar' (bob norm = 0) and 'bobMax' (alice norm = 0)
    // both survive into the ranked output.
    const result = recommendForGroup(members, candidates, { vetoThreshold: 0, lambda: 0.5 });

    const idxUniform = result.findIndex((r) => r.titleId === 'uniform');
    const idxPolar = result.findIndex((r) => r.titleId === 'polar');

    expect(idxUniform).toBeGreaterThanOrEqual(0);
    expect(idxPolar).toBeGreaterThanOrEqual(0);
    expect(idxUniform).toBeLessThan(idxPolar);
  });

  it('ties uniform and polar candidates with equal means when lambda is 0, then breaks by titleId ASC', () => {
    // Same fixture as the lambda penalty test, but with lambda=0 the
    // disagreement penalty disappears and the two equal-mean candidates
    // tie on groupScore. Tie-break by titleId ASC ('polar' < 'uniform').
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      { userId: 'bob', taste: taste([['dramaT', 100]]) },
    ];
    const candidates: TitleTagSet[] = [
      { titleId: 'aliceMax', tags: [{ tagId: 'actionT', weight: 100 }] },
      { titleId: 'bobMax', tags: [{ tagId: 'dramaT', weight: 100 }] },
      {
        titleId: 'uniform',
        tags: [
          { tagId: 'actionT', weight: 50 },
          { tagId: 'dramaT', weight: 50 },
        ],
      },
      { titleId: 'polar', tags: [{ tagId: 'actionT', weight: 100 }] },
    ];
    const result = recommendForGroup(members, candidates, { vetoThreshold: 0, lambda: 0 });

    const uniform = result.find((r) => r.titleId === 'uniform');
    const polar = result.find((r) => r.titleId === 'polar');
    expect(uniform).toBeDefined();
    expect(polar).toBeDefined();
    expect(uniform?.groupScore).toBe(polar?.groupScore);

    // Among the two equal-mean entries, tie-break is titleId ASC.
    const idxUniform = result.findIndex((r) => r.titleId === 'uniform');
    const idxPolar = result.findIndex((r) => r.titleId === 'polar');
    expect(idxPolar).toBeLessThan(idxUniform);
  });

  it('does not veto a cold-start member with empty taste even when vetoThreshold is positive', () => {
    // Per the JSDoc cold-start guard: a member whose maxRaw == 0 (no signal
    // yet) contributes 0 to per-user score and never vetoes. Other members'
    // scores drive the ranking.
    const members: GroupMember[] = [
      {
        userId: 'alice',
        taste: taste([
          ['actionT', 100],
          ['mechaT', 80],
        ]),
      },
      // Bob is cold-start — empty taste vector, no signal in any candidate.
      { userId: 'bob', taste: taste([]) },
    ];
    const candidates: TitleTagSet[] = [
      {
        titleId: 'forAlice',
        tags: [
          { tagId: 'actionT', weight: 80 },
          { tagId: 'mechaT', weight: 70 },
        ],
      },
      { titleId: 'unrelated', tags: [{ tagId: 'romanceT', weight: 80 }] },
    ];
    const result = recommendForGroup(members, candidates, { vetoThreshold: 0.5, lambda: 0 });

    // The cold-start guard means SOME candidate must survive — specifically
    // Alice's top pick.
    const ids = result.map((r) => r.titleId);
    expect(ids).toContain('forAlice');
  });

  it('still ranks by the non-cold-start member when one member has empty taste', () => {
    // Same setup as the prior test. Alice's preference order should drive
    // the ranking among candidates that all survive the (cold-start-guarded)
    // veto check.
    const members: GroupMember[] = [
      {
        userId: 'alice',
        taste: taste([
          ['actionT', 100],
          ['mechaT', 80],
        ]),
      },
      { userId: 'bob', taste: taste([]) }, // cold-start
    ];
    // Two candidates Alice ranks differently. With vetoThreshold=0 we know
    // both survive regardless of the cold-start interpretation, so we can
    // read the relative ranking driven by Alice.
    const candidates: TitleTagSet[] = [
      {
        titleId: 'aliceTop',
        tags: [
          { tagId: 'actionT', weight: 80 },
          { tagId: 'mechaT', weight: 70 },
        ],
      },
      { titleId: 'aliceMid', tags: [{ tagId: 'mechaT', weight: 30 }] },
    ];
    const result = recommendForGroup(members, candidates, { vetoThreshold: 0, lambda: 0 });

    expect(result[0]?.titleId).toBe('aliceTop');
    expect(result[1]?.titleId).toBe('aliceMid');
  });

  it('lifts a candidate that bridges to a second member via cross-medium theme membership', () => {
    // Alice has direct-tag signal in `tmdb:tragedy`. Bob has direct-tag
    // signal in `anilist:Tragedy` (a different tag, but member of the same
    // theme). A bridge-candidate carries `anilist:Tragedy` — it scores
    // directly for Bob and via the theme bridge for Alice. A
    // direct-only candidate carries only `tmdb:tragedy` — it scores
    // directly for Alice only and bridges to Bob's signal via the theme.
    // We'd like to show that the BRIDGE candidate (which scores well for
    // both members across paths) is at the top of the group ranking.
    //
    // To make the assertion concrete: with vetoThreshold=0 and lambda=0,
    // a candidate that scores for both members will outrank a candidate
    // that only scores for one. Add an `unrelated` candidate so we can
    // pin its rank as the bottom.
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['tmdb:tragedy', 100]]) },
      { userId: 'bob', taste: taste([['anilist:Tragedy', 100]]) },
    ];
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:Tragedy', themeId: 'tragedy', strength: 100 },
    ];
    const candidates: TitleTagSet[] = [
      // Bridges to BOTH members — direct tag for Bob, theme bridge for Alice.
      { titleId: 'crossMediumBridge', tags: [{ tagId: 'anilist:Tragedy', weight: 80 }] },
      // Unrelated — neither member should score it directly nor via theme.
      { titleId: 'unrelated', tags: [{ tagId: 'anilist:CookingShow', weight: 80 }] },
    ];
    const result = recommendForGroup(
      members,
      candidates,
      { vetoThreshold: 0, lambda: 0 },
      themeMembership,
    );

    expect(result[0]?.titleId).toBe('crossMediumBridge');
  });

  it('survives a positive vetoThreshold for a mixed-medium couple ONLY when the theme bridge is provided', () => {
    // The differentiator scenario from ADR-0020 §what-would-change-our-mind.
    // Alice = TV fan (tmdb:tragedy taste); Bob = anime fan (anilist:Tragedy
    // taste). A candidate carrying anilist:Tragedy scores direct-tag for
    // Bob; for Alice it can ONLY score via the cross-medium theme bridge.
    //
    // With themeMembership present, Alice's normalised score on this
    // candidate > 0 and the candidate survives a positive vetoThreshold of
    // 0.5 (Alice's bridge contribution is her personal max → norm = 1).
    // Without themeMembership, Alice's score = 0 → norm = 0 → vetoed.
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['tmdb:tragedy', 100]]) },
      { userId: 'bob', taste: taste([['anilist:Tragedy', 100]]) },
    ];
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:Tragedy', themeId: 'tragedy', strength: 100 },
    ];
    const candidates: TitleTagSet[] = [
      { titleId: 'animeBridge', tags: [{ tagId: 'anilist:Tragedy', weight: 80 }] },
    ];
    const params: GroupScoreParams = { vetoThreshold: 0.5, lambda: 0 };

    const withBridge = recommendForGroup(members, candidates, params, themeMembership);
    const withoutBridge = recommendForGroup(members, candidates, params);

    expect(withBridge.map((r) => r.titleId)).toEqual(['animeBridge']);
    expect(withoutBridge).toEqual([]);
  });

  it('populates perUserScores with one entry per group member for every included candidate', () => {
    // Transparency-layer contract: the per-user map must contain ALL members
    // (no missing members), and each value must be in [0, 1] (the normalised
    // scale on which vetoThreshold operates).
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      {
        userId: 'bob',
        taste: taste([
          ['actionT', 80],
          ['mechaT', 60],
        ]),
      },
      { userId: 'carol', taste: taste([['mechaT', 100]]) },
    ];
    const candidates: TitleTagSet[] = [
      {
        titleId: 'shared',
        tags: [
          { tagId: 'actionT', weight: 70 },
          { tagId: 'mechaT', weight: 70 },
        ],
      },
      { titleId: 'aliceOnly', tags: [{ tagId: 'actionT', weight: 80 }] },
      { titleId: 'carolOnly', tags: [{ tagId: 'mechaT', weight: 80 }] },
    ];
    const result = recommendForGroup(members, candidates, { vetoThreshold: 0, lambda: 0 });

    expect(result.length).toBe(3);
    for (const rec of result) {
      const userIds = Array.from(rec.perUserScores.keys()).sort();
      expect(userIds).toEqual(['alice', 'bob', 'carol']);
      for (const score of rec.perUserScores.values()) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    }
  });

  it("normalises each member's top-scoring candidate to exactly 1.0 in perUserScores", () => {
    // Per-user normalisation is divide-by-personal-max. For each member,
    // SOME included candidate should hit norm = 1.0 — their personal best
    // across the candidate set.
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      { userId: 'bob', taste: taste([['mechaT', 100]]) },
    ];
    const candidates: TitleTagSet[] = [
      { titleId: 'aliceTop', tags: [{ tagId: 'actionT', weight: 100 }] },
      { titleId: 'bobTop', tags: [{ tagId: 'mechaT', weight: 100 }] },
      {
        titleId: 'middle',
        tags: [
          { tagId: 'actionT', weight: 50 },
          { tagId: 'mechaT', weight: 50 },
        ],
      },
    ];
    const result = recommendForGroup(members, candidates, { vetoThreshold: 0, lambda: 0 });

    const byId = new Map(result.map((r) => [r.titleId, r]));
    expect(byId.get('aliceTop')?.perUserScores.get('alice')).toBe(1);
    expect(byId.get('bobTop')?.perUserScores.get('bob')).toBe(1);
  });

  it('breaks groupScore ties deterministically by titleId ASC regardless of input order', () => {
    // Two candidates with identical tag sets → identical perUser raw scores
    // → identical norms → identical groupScore. Tie-break by titleId ASC.
    // Run with both input orderings to lock that the result is stable.
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      { userId: 'bob', taste: taste([['actionT', 100]]) },
    ];
    const tieTags = [{ tagId: 'actionT', weight: 50 }];

    const orderA: TitleTagSet[] = [
      { titleId: 'zebra', tags: tieTags },
      { titleId: 'apple', tags: tieTags },
    ];
    const orderB: TitleTagSet[] = [
      { titleId: 'apple', tags: tieTags },
      { titleId: 'zebra', tags: tieTags },
    ];
    const params: GroupScoreParams = { vetoThreshold: 0, lambda: 0.5 };

    const idsA = recommendForGroup(members, orderA, params).map((r) => r.titleId);
    const idsB = recommendForGroup(members, orderB, params).map((r) => r.titleId);

    expect(idsA).toEqual(['apple', 'zebra']);
    expect(idsB).toEqual(['apple', 'zebra']);
  });

  it('uses the ADR-0020 defaults (vetoThreshold=0.5, lambda=0.5) when params are omitted', () => {
    // With the defaults, the same compatible-couple fixture should produce
    // a non-empty ranked output topped by the both-members candidate. A
    // one-sided candidate scoring 0 for one member must be vetoed (its
    // norm = 0 is strictly < 0.5).
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      { userId: 'bob', taste: taste([['actionT', 100]]) },
    ];
    const candidates: TitleTagSet[] = [
      { titleId: 'both', tags: [{ tagId: 'actionT', weight: 80 }] },
      // Survives nothing: weight=0 actionT means scoreCandidate yields 0
      // for both members, while their max comes from `both`. So norm=0 →
      // vetoed at default threshold 0.5.
      { titleId: 'neither', tags: [{ tagId: 'romanceT', weight: 80 }] },
    ];
    const result = recommendForGroup(members, candidates);

    const ids = result.map((r) => r.titleId);
    expect(ids).toContain('both');
    expect(ids).not.toContain('neither');
  });
});
