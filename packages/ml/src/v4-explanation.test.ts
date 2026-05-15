import { describe, it, expect } from 'vitest';
import { explainRecommendation } from './explain';
import type { ExplanationReason } from './explain';
import type {
  ComparableEdge,
  TagThemeMembership,
  TitleTagSet,
  UserTasteVector,
  V4Descriptor,
  V4RecInputs,
  V4TasteVector,
  V4Theme,
} from './recommendation';

// Fixture conventions for V4 explanation tests (per ADR-0027, ADR-0025):
//
//   - Per packages/ml/CLAUDE.md §8.1 this is an Approach B test pass. Tests
//     assert on STRUCTURE (which reason kinds appear, which fields are set),
//     SIGN of contribution (positive vs negative), and RELATIVE ORDERING.
//     Absolute scores are never asserted — β, γ, δ are tunable constants and
//     hard-coding them in tests would defeat the purpose of the abstraction.
//
//   - Theme slugs use the closed-vocab kebab-case style (`tragedy`,
//     `coming-of-age`); confidence ≥ 0.5 per ADR-0025.
//
//   - Enum values use exact ADR-0025 spellings:
//       narrative_mode: 'plays-straight' | 'deconstructs' | 'parodies' |
//                       'reinvents' | 'hybrid'
//       engagement_level: 'low' | 'medium' | 'high'
//       stakes_scale: 'interpersonal' | 'community' | 'national' |
//                     'civilizational' | 'cosmic'
//
//   - Ratings use the ADR-0024 bipolar scale: rating - 5.5 / 4.5. We pass
//     pre-computed *deltas* to V4RecInputs.userRatings (positive = liked,
//     negative = disliked) since that's what the V4 contract receives.

const taste = (entries: ReadonlyArray<readonly [string, number]>): UserTasteVector =>
  new Map<string, number>(entries);

const desc = (
  themes: ReadonlyArray<V4Theme>,
  narrativeMode = 'plays-straight',
  engagementLevel = 'medium',
  stakesScale = 'interpersonal',
): V4Descriptor => ({ themes, narrativeMode, engagementLevel, stakesScale });

const emptyV4Taste = (): V4TasteVector => ({
  themesByWeight: new Map<string, number>(),
  modePref: new Map<string, number>(),
  engagementPref: new Map<string, number>(),
  stakesPref: new Map<string, number>(),
});

const v4TasteWith = (overrides: {
  themesByWeight?: ReadonlyArray<readonly [string, number]>;
  modePref?: ReadonlyArray<readonly [string, number]>;
  engagementPref?: ReadonlyArray<readonly [string, number]>;
  stakesPref?: ReadonlyArray<readonly [string, number]>;
}): V4TasteVector => ({
  themesByWeight: new Map<string, number>(overrides.themesByWeight ?? []),
  modePref: new Map<string, number>(overrides.modePref ?? []),
  engagementPref: new Map<string, number>(overrides.engagementPref ?? []),
  stakesPref: new Map<string, number>(overrides.stakesPref ?? []),
});

// Behaviour 1 — backward compatibility ------------------------------------

describe('explainRecommendation — backward compatibility (no v4)', () => {
  it('returns ONLY V1 reason kinds (direct-tag, theme-bridge) when v4 is omitted', () => {
    // Direct tag overlap on actionT + theme bridge tmdb:tragedy ↔ anilist:Tragedy.
    const tasteV: UserTasteVector = taste([
      ['actionT', 100],
      ['tmdb:tragedy', 100],
    ]);
    const candidate: TitleTagSet = {
      titleId: 'c1',
      tags: [
        { tagId: 'actionT', weight: 70 },
        { tagId: 'anilist:Tragedy', weight: 50 },
      ],
    };
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:Tragedy', themeId: 'tragedy', strength: 100 },
    ];

    const reasons = explainRecommendation(tasteV, candidate, themeMembership);

    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.every((r) => r.kind === 'direct-tag' || r.kind === 'theme-bridge')).toBe(true);
    // No V4 kinds leak in when v4 is undefined.
    const v4Kinds: ReadonlyArray<ExplanationReason['kind']> = [
      'v4-theme',
      'v4-comparable',
      'v4-enum-fit',
    ];
    expect(reasons.some((r) => v4Kinds.includes(r.kind))).toBe(false);
  });

  it('returns identical results to the v4-undefined call when v4 is omitted (idempotent)', () => {
    // Whether the caller passes no v4 OR passes nothing at all, the V1 path
    // must produce the same reasons in the same order.
    const tasteV: UserTasteVector = taste([['actionT', 100]]);
    const candidate: TitleTagSet = {
      titleId: 'c1',
      tags: [{ tagId: 'actionT', weight: 60 }],
    };

    const withoutV4 = explainRecommendation(tasteV, candidate);
    const withEmptyMembership = explainRecommendation(tasteV, candidate, []);

    expect(
      withoutV4.map((r) => ({ kind: r.kind, tagId: r.tagId, contribution: r.contribution })),
    ).toEqual(
      withEmptyMembership.map((r) => ({
        kind: r.kind,
        tagId: r.tagId,
        contribution: r.contribution,
      })),
    );
  });
});

// Behaviour 2 — V4 reason kinds appear when v4 is supplied ----------------

describe('explainRecommendation — v4-theme reasons', () => {
  it('emits one v4-theme reason per overlapping (candidate-theme ∩ user-theme-taste) pair with themeSlug set', () => {
    const tasteV: UserTasteVector = taste([]); // No V1 taste — isolate V4 themes.
    const candidate: TitleTagSet = { titleId: 'c1', tags: [] };
    const v4: V4RecInputs = {
      taste: v4TasteWith({
        themesByWeight: [
          ['tragedy', 10],
          ['coming-of-age', 8],
        ],
      }),
      candidateDescriptors: new Map<string, V4Descriptor>([
        [
          'c1',
          desc([
            { slug: 'tragedy', confidence: 1.0 },
            { slug: 'coming-of-age', confidence: 0.7 },
          ]),
        ],
      ]),
      comparableEdges: [],
      userRatings: new Map<string, number>(),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);
    const themeReasons = reasons.filter((r) => r.kind === 'v4-theme');

    expect(themeReasons.length).toBe(2);
    const slugs = themeReasons.map((r) => r.themeSlug).sort();
    expect(slugs).toEqual(['coming-of-age', 'tragedy']);
    // Positive user weight × positive confidence → positive contribution.
    expect(themeReasons.every((r) => r.contribution > 0)).toBe(true);
  });

  it('does NOT emit a v4-theme reason for a theme on the candidate that the user has no weight in', () => {
    const tasteV: UserTasteVector = taste([]);
    const candidate: TitleTagSet = { titleId: 'c1', tags: [] };
    const v4: V4RecInputs = {
      taste: v4TasteWith({ themesByWeight: [['tragedy', 10]] }),
      candidateDescriptors: new Map<string, V4Descriptor>([
        [
          'c1',
          desc([
            { slug: 'tragedy', confidence: 1.0 },
            { slug: 'cosmic-horror', confidence: 1.0 }, // user has no weight here
          ]),
        ],
      ]),
      comparableEdges: [],
      userRatings: new Map<string, number>(),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);
    const themeReasons = reasons.filter((r) => r.kind === 'v4-theme');

    expect(themeReasons.length).toBe(1);
    expect(themeReasons[0]?.themeSlug).toBe('tragedy');
  });
});

describe('explainRecommendation — v4-comparable reasons', () => {
  it('emits one v4-comparable reason per edge connecting candidate to a rated title with comparableTitleId, comparableDirection, comparablePosition set', () => {
    const tasteV: UserTasteVector = taste([]);
    const candidate: TitleTagSet = { titleId: 'c1', tags: [] };
    const v4: V4RecInputs = {
      taste: emptyV4Taste(),
      candidateDescriptors: new Map<string, V4Descriptor>(), // no descriptor — edges are descriptor-independent
      comparableEdges: [
        { fromTitleId: 'ratedA', toTitleId: 'c1', position: 0 }, // inbound to c1
      ],
      userRatings: new Map<string, number>([['ratedA', 1.0]]), // strongly liked
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);
    const compReasons = reasons.filter((r) => r.kind === 'v4-comparable');

    expect(compReasons.length).toBe(1);
    const r = compReasons[0];
    expect(r?.comparableTitleId).toBe('ratedA');
    expect(r?.comparableDirection).toBeDefined();
    expect(r?.comparablePosition).toBe(0);
    expect((r?.contribution ?? 0) > 0).toBe(true);
  });
});

describe('explainRecommendation — v4-enum-fit reasons', () => {
  it('emits a v4-enum-fit reason per matching enum bucket with non-zero user weight, with enumField and enumValue set', () => {
    const tasteV: UserTasteVector = taste([]);
    const candidate: TitleTagSet = { titleId: 'c1', tags: [] };
    const v4: V4RecInputs = {
      taste: v4TasteWith({
        modePref: [['deconstructs', 5]],
        engagementPref: [['high', 3]],
        stakesPref: [['cosmic', 4]],
      }),
      candidateDescriptors: new Map<string, V4Descriptor>([
        ['c1', desc([], 'deconstructs', 'high', 'cosmic')],
      ]),
      comparableEdges: [],
      userRatings: new Map<string, number>(),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);
    const enumReasons = reasons.filter((r) => r.kind === 'v4-enum-fit');

    expect(enumReasons.length).toBe(3);
    const fields = enumReasons.map((r) => r.enumField).sort();
    expect(fields).toEqual(['engagement', 'mode', 'stakes']);
    const byField = new Map(enumReasons.map((r) => [r.enumField, r] as const));
    expect(byField.get('mode')?.enumValue).toBe('deconstructs');
    expect(byField.get('engagement')?.enumValue).toBe('high');
    expect(byField.get('stakes')?.enumValue).toBe('cosmic');
    expect(enumReasons.every((r) => (r.contribution ?? 0) > 0)).toBe(true);
  });
});

// Behaviour 3 — rating valence flows through ------------------------------

describe('explainRecommendation — rating valence', () => {
  it('produces a NEGATIVE-contribution v4-comparable reason when the rated source title was disliked', () => {
    const tasteV: UserTasteVector = taste([]);
    const candidate: TitleTagSet = { titleId: 'c1', tags: [] };
    const v4: V4RecInputs = {
      taste: emptyV4Taste(),
      candidateDescriptors: new Map<string, V4Descriptor>(),
      comparableEdges: [{ fromTitleId: 'hatedX', toTitleId: 'c1', position: 0 }],
      // Negative rating delta — user gave hatedX a low rating per ADR-0024.
      userRatings: new Map<string, number>([['hatedX', -1.0]]),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);
    const compReasons = reasons.filter((r) => r.kind === 'v4-comparable');

    expect(compReasons.length).toBe(1);
    expect(compReasons[0]?.comparableTitleId).toBe('hatedX');
    expect((compReasons[0]?.contribution ?? 0) < 0).toBe(true);
  });
});

// Behaviour 4 — empty contributions are not emitted -----------------------

describe('explainRecommendation — empty contributions are suppressed', () => {
  it('does not emit v4-theme reasons when the candidate has themes but the user has no overlapping theme weight', () => {
    const tasteV: UserTasteVector = taste([]);
    const candidate: TitleTagSet = { titleId: 'c1', tags: [] };
    const v4: V4RecInputs = {
      taste: emptyV4Taste(), // no theme weight anywhere
      candidateDescriptors: new Map<string, V4Descriptor>([
        ['c1', desc([{ slug: 'tragedy', confidence: 1.0 }])],
      ]),
      comparableEdges: [],
      userRatings: new Map<string, number>(),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);
    expect(reasons.some((r) => r.kind === 'v4-theme')).toBe(false);
  });

  it('does not emit a v4-comparable reason for an edge to a title the user has not rated', () => {
    const tasteV: UserTasteVector = taste([]);
    const candidate: TitleTagSet = { titleId: 'c1', tags: [] };
    const v4: V4RecInputs = {
      taste: emptyV4Taste(),
      candidateDescriptors: new Map<string, V4Descriptor>(),
      comparableEdges: [{ fromTitleId: 'unratedY', toTitleId: 'c1', position: 0 }],
      userRatings: new Map<string, number>(), // no entry for unratedY
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);
    expect(reasons.some((r) => r.kind === 'v4-comparable')).toBe(false);
  });

  it('does not emit v4-enum-fit reasons for enum buckets the user has zero weight in', () => {
    const tasteV: UserTasteVector = taste([]);
    const candidate: TitleTagSet = { titleId: 'c1', tags: [] };
    const v4: V4RecInputs = {
      taste: v4TasteWith({
        // Only mode has weight; engagement/stakes are empty.
        modePref: [['deconstructs', 5]],
      }),
      candidateDescriptors: new Map<string, V4Descriptor>([
        ['c1', desc([], 'deconstructs', 'medium', 'interpersonal')],
      ]),
      comparableEdges: [],
      userRatings: new Map<string, number>(),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);
    const enumReasons = reasons.filter((r) => r.kind === 'v4-enum-fit');

    expect(enumReasons.length).toBe(1);
    expect(enumReasons[0]?.enumField).toBe('mode');
    expect(enumReasons[0]?.enumValue).toBe('deconstructs');
  });
});

// Behaviour 5 — bidirectional edges produce two separate reasons ---------

describe('explainRecommendation — bidirectional comparable edges', () => {
  it('emits two distinct v4-comparable reasons when both inbound and outbound edges connect to the same rated title', () => {
    const tasteV: UserTasteVector = taste([]);
    const candidate: TitleTagSet = { titleId: 'c1', tags: [] };
    const v4: V4RecInputs = {
      taste: emptyV4Taste(),
      candidateDescriptors: new Map<string, V4Descriptor>(),
      comparableEdges: [
        // rated → candidate (inbound to c1)
        { fromTitleId: 'ratedA', toTitleId: 'c1', position: 1 },
        // candidate → rated (outbound from c1)
        { fromTitleId: 'c1', toTitleId: 'ratedA', position: 2 },
      ],
      userRatings: new Map<string, number>([['ratedA', 1.0]]),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);
    const compReasons = reasons.filter((r) => r.kind === 'v4-comparable');

    expect(compReasons.length).toBe(2);
    expect(compReasons.every((r) => r.comparableTitleId === 'ratedA')).toBe(true);
    // The two reasons differ on direction — one inbound, one outbound.
    const directions = compReasons
      .map((r) => r.comparableDirection)
      .filter((d): d is 'inbound' | 'outbound' => d !== undefined)
      .sort();
    expect(directions).toEqual(['inbound', 'outbound']);
  });
});

// Behaviour 6 — combined reasons sorted by contribution descending --------

describe('explainRecommendation — combined V1 + V4 ordering', () => {
  it('places a high V1 direct-tag reason above a low V4 reason in the combined list', () => {
    // Big V1 direct-tag contribution: 100 × 100 = 10_000.
    // Small V4 theme: tiny user weight × tiny confidence.
    const tasteV: UserTasteVector = taste([['actionT', 100]]);
    const candidate: TitleTagSet = {
      titleId: 'c1',
      tags: [{ tagId: 'actionT', weight: 100 }],
    };
    const v4: V4RecInputs = {
      taste: v4TasteWith({ themesByWeight: [['tragedy', 0.001]] }),
      candidateDescriptors: new Map<string, V4Descriptor>([
        ['c1', desc([{ slug: 'tragedy', confidence: 0.5 }])],
      ]),
      comparableEdges: [],
      userRatings: new Map<string, number>(),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);

    expect(reasons.length).toBeGreaterThanOrEqual(2);
    expect(reasons[0]?.kind).toBe('direct-tag');
    // V4 reason must appear AFTER the V1 direct-tag reason.
    const v1Idx = reasons.findIndex((r) => r.kind === 'direct-tag');
    const v4Idx = reasons.findIndex((r) => r.kind === 'v4-theme');
    expect(v4Idx).toBeGreaterThan(v1Idx);
  });

  it('places a high V4 reason above a low V1 direct-tag reason in the combined list', () => {
    // Tiny V1: 1 × 1 = 1. Big V4 theme: huge user weight × full confidence.
    const tasteV: UserTasteVector = taste([['actionT', 1]]);
    const candidate: TitleTagSet = {
      titleId: 'c1',
      tags: [{ tagId: 'actionT', weight: 1 }],
    };
    const v4: V4RecInputs = {
      taste: v4TasteWith({ themesByWeight: [['tragedy', 10_000]] }),
      candidateDescriptors: new Map<string, V4Descriptor>([
        ['c1', desc([{ slug: 'tragedy', confidence: 1.0 }])],
      ]),
      comparableEdges: [],
      userRatings: new Map<string, number>(),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);

    expect(reasons.length).toBeGreaterThanOrEqual(2);
    expect(reasons[0]?.kind).toBe('v4-theme');
    const v1Idx = reasons.findIndex((r) => r.kind === 'direct-tag');
    const v4Idx = reasons.findIndex((r) => r.kind === 'v4-theme');
    expect(v1Idx).toBeGreaterThan(v4Idx);
  });

  it('produces a globally-descending contribution sequence across the combined V1 + V4 list', () => {
    // Build a mix of contributions of clearly distinct magnitudes so the
    // whole-list sort is observable without pinning absolute values.
    const tasteV: UserTasteVector = taste([
      ['actionT', 100],
      ['mechaT', 10],
    ]);
    const candidate: TitleTagSet = {
      titleId: 'c1',
      tags: [
        { tagId: 'actionT', weight: 100 },
        { tagId: 'mechaT', weight: 10 },
      ],
    };
    const v4: V4RecInputs = {
      taste: v4TasteWith({
        themesByWeight: [['tragedy', 50]],
        modePref: [['deconstructs', 1]],
      }),
      candidateDescriptors: new Map<string, V4Descriptor>([
        [
          'c1',
          desc([{ slug: 'tragedy', confidence: 1.0 }], 'deconstructs', 'medium', 'interpersonal'),
        ],
      ]),
      comparableEdges: [],
      userRatings: new Map<string, number>(),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);

    expect(reasons.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < reasons.length; i += 1) {
      expect(reasons[i]!.contribution).toBeLessThanOrEqual(reasons[i - 1]!.contribution);
    }
  });
});

// Behaviour 7 — V4 with no descriptor for candidate -----------------------

describe('explainRecommendation — candidate without a V4 descriptor', () => {
  it('still emits v4-comparable reasons (edges are descriptor-independent) but no v4-theme or v4-enum-fit reasons', () => {
    const tasteV: UserTasteVector = taste([]);
    const candidate: TitleTagSet = { titleId: 'c1', tags: [] };
    const v4: V4RecInputs = {
      taste: v4TasteWith({
        themesByWeight: [['tragedy', 10]],
        modePref: [['deconstructs', 5]],
        engagementPref: [['high', 3]],
        stakesPref: [['cosmic', 4]],
      }),
      // No descriptor for c1 — themes/enums cannot fire.
      candidateDescriptors: new Map<string, V4Descriptor>(),
      comparableEdges: [{ fromTitleId: 'ratedA', toTitleId: 'c1', position: 0 }],
      userRatings: new Map<string, number>([['ratedA', 1.0]]),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);

    expect(reasons.some((r) => r.kind === 'v4-comparable')).toBe(true);
    expect(reasons.some((r) => r.kind === 'v4-theme')).toBe(false);
    expect(reasons.some((r) => r.kind === 'v4-enum-fit')).toBe(false);
  });
});

// Behaviour 8 — empty userRatings → no v4-comparable reasons -------------

describe('explainRecommendation — empty userRatings', () => {
  it('emits no v4-comparable reasons even when edges connect the candidate to other titles', () => {
    const tasteV: UserTasteVector = taste([]);
    const candidate: TitleTagSet = { titleId: 'c1', tags: [] };
    const edges: ComparableEdge[] = [
      { fromTitleId: 'someA', toTitleId: 'c1', position: 0 },
      { fromTitleId: 'c1', toTitleId: 'someB', position: 1 },
    ];
    const v4: V4RecInputs = {
      taste: emptyV4Taste(),
      candidateDescriptors: new Map<string, V4Descriptor>(),
      comparableEdges: edges,
      // No ratings at all — there is no valence to multiply the edge by.
      userRatings: new Map<string, number>(),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);

    expect(reasons.some((r) => r.kind === 'v4-comparable')).toBe(false);
  });
});
