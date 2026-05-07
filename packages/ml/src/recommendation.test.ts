import { describe, it, expect } from 'vitest';
import {
  extractTasteVector,
  recommendForUser,
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
