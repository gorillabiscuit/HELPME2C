import { describe, it, expect } from 'vitest';
import {
  buildV4TasteVector,
  recommendForGroup,
  recommendForUser,
  type ComparableEdge,
  type GroupMember,
  type TitleTagSet,
  type UserTasteVector,
  type V4Descriptor,
  type V4GroupInputs,
  type V4RecInputs,
  type V4TasteVector,
  type V4Theme,
} from './recommendation';

// Fixture conventions for V4 scoring tests (per ADR-0027):
//
//   - Asserts target rankings or sign-of-contribution, never absolute scores
//     (per packages/ml/CLAUDE.md). The weights β=1.0, γ=0.8, δ=0.3 are
//     load-bearing for the implementation but should not be encoded in
//     tests — they're tunable constants and rebalancing them must not break
//     these tests' meaning.
//
//   - Theme slugs are short kebab-case identifiers matching the closed-vocab
//     style of apps/web/src/server/themes/vocabulary.ts (`tragedy`,
//     `coming-of-age`, `cosmic-horror`). Confidence ≥ 0.5 per ADR-0025.
//
//   - Enum values use exact ADR-0025 spellings (`plays-straight`,
//     `deconstructs`, `parodies`, `reinvents`, `hybrid` for narrative_mode;
//     `low` | `medium` | `high` for engagement_level; `interpersonal` |
//     `community` | `national` | `civilizational` | `cosmic` for stakes_scale).
//
//   - Ratings use the ADR-0024 bipolar scale: 10 → strongly positive,
//     5/6 → near-neutral, 1 → strongly negative.

const EMPTY_TASTE: UserTasteVector = new Map();
const EMPTY_RATINGS: ReadonlyMap<string, number> = new Map();

const desc = (
  themes: ReadonlyArray<V4Theme>,
  narrativeMode = 'plays-straight',
  engagementLevel = 'medium',
  stakesScale = 'interpersonal',
): V4Descriptor => ({ themes, narrativeMode, engagementLevel, stakesScale });

const titleNoTags = (titleId: string): TitleTagSet => ({ titleId, tags: [] });

describe('buildV4TasteVector', () => {
  it('builds an empty taste vector for an empty history', () => {
    const taste = buildV4TasteVector({ anchors: [], ratings: [] }, new Map<string, V4Descriptor>());

    expect(taste.themesByWeight.size).toBe(0);
    expect(taste.modePref.size).toBe(0);
    expect(taste.engagementPref.size).toBe(0);
    expect(taste.stakesPref.size).toBe(0);
  });

  it('contributes positively for an anchor pick (themes appear with positive weight)', () => {
    const descriptors = new Map<string, V4Descriptor>([
      [
        't1',
        desc(
          [
            { slug: 'tragedy', confidence: 1.0 },
            { slug: 'coming-of-age', confidence: 0.8 },
          ],
          'deconstructs',
          'high',
          'interpersonal',
        ),
      ],
    ]);
    const taste = buildV4TasteVector({ anchors: [{ titleId: 't1' }], ratings: [] }, descriptors);

    expect((taste.themesByWeight.get('tragedy') ?? 0) > 0).toBe(true);
    expect((taste.themesByWeight.get('coming-of-age') ?? 0) > 0).toBe(true);
    expect((taste.modePref.get('deconstructs') ?? 0) > 0).toBe(true);
    expect((taste.engagementPref.get('high') ?? 0) > 0).toBe(true);
    expect((taste.stakesPref.get('interpersonal') ?? 0) > 0).toBe(true);
  });

  it('contributes positively for a rating of 10 (loved title contributes positive theme weight)', () => {
    const descriptors = new Map<string, V4Descriptor>([
      ['t1', desc([{ slug: 'tragedy', confidence: 1.0 }], 'deconstructs', 'high', 'cosmic')],
    ]);
    const taste = buildV4TasteVector(
      { anchors: [], ratings: [{ titleId: 't1', rating: 10 }] },
      descriptors,
    );

    expect((taste.themesByWeight.get('tragedy') ?? 0) > 0).toBe(true);
    expect((taste.modePref.get('deconstructs') ?? 0) > 0).toBe(true);
    expect((taste.engagementPref.get('high') ?? 0) > 0).toBe(true);
    expect((taste.stakesPref.get('cosmic') ?? 0) > 0).toBe(true);
  });

  it('contributes NEGATIVELY for a rating of 1 (hated title subtracts from theme weight)', () => {
    // ADR-0024: rating 1 maps to multiplier -1.0. The hated title's themes
    // and enum buckets must end up with NEGATIVE weight.
    const descriptors = new Map<string, V4Descriptor>([
      ['t1', desc([{ slug: 'tragedy', confidence: 1.0 }], 'deconstructs', 'high', 'cosmic')],
    ]);
    const taste = buildV4TasteVector(
      { anchors: [], ratings: [{ titleId: 't1', rating: 1 }] },
      descriptors,
    );

    expect((taste.themesByWeight.get('tragedy') ?? 0) < 0).toBe(true);
    expect((taste.modePref.get('deconstructs') ?? 0) < 0).toBe(true);
    expect((taste.engagementPref.get('high') ?? 0) < 0).toBe(true);
    expect((taste.stakesPref.get('cosmic') ?? 0) < 0).toBe(true);
  });

  it('maps rating 1 and rating 10 to equal-magnitude opposite-sign contributions', () => {
    // Symmetric bipolar mapping per ADR-0024: 1 → -1.0, 10 → +1.0.
    const descriptors = new Map<string, V4Descriptor>([
      ['t1', desc([{ slug: 'tragedy', confidence: 1.0 }])],
    ]);
    const tasteHi = buildV4TasteVector(
      { anchors: [], ratings: [{ titleId: 't1', rating: 10 }] },
      descriptors,
    );
    const tasteLo = buildV4TasteVector(
      { anchors: [], ratings: [{ titleId: 't1', rating: 1 }] },
      descriptors,
    );

    const hi = tasteHi.themesByWeight.get('tragedy') ?? 0;
    const lo = tasteLo.themesByWeight.get('tragedy') ?? 0;
    expect(hi).toBeCloseTo(-lo, 10);
  });

  it('produces a near-zero theme contribution for a rating of 5.5 (neutral midpoint)', () => {
    // ADR-0024: (5.5 - 5.5) / 4.5 = 0 — neutral, no taste signal either way.
    // A rating of 5.5 should leave the taste vector empty (zero
    // contribution suppressed) OR produce a value indistinguishable from
    // zero. Either way it should be far smaller than the rating-10
    // contribution from the same descriptor.
    const descriptors = new Map<string, V4Descriptor>([
      ['t1', desc([{ slug: 'tragedy', confidence: 1.0 }])],
    ]);
    const tasteNeutral = buildV4TasteVector(
      { anchors: [], ratings: [{ titleId: 't1', rating: 5.5 }] },
      descriptors,
    );
    const tasteLoved = buildV4TasteVector(
      { anchors: [], ratings: [{ titleId: 't1', rating: 10 }] },
      descriptors,
    );
    const neutral = tasteNeutral.themesByWeight.get('tragedy') ?? 0;
    const loved = tasteLoved.themesByWeight.get('tragedy') ?? 0;

    expect(Math.abs(neutral)).toBeLessThan(Math.abs(loved) / 10);
  });

  it('weights themes by per-theme confidence: a 0.9-confidence theme contributes more than a 0.5-confidence theme from the same rated title', () => {
    // Same rating, same title — the higher-confidence theme accumulates a
    // larger absolute weight than the lower-confidence theme.
    const descriptors = new Map<string, V4Descriptor>([
      [
        't1',
        desc([
          { slug: 'central-theme', confidence: 0.9 },
          { slug: 'secondary-theme', confidence: 0.5 },
        ]),
      ],
    ]);
    const taste = buildV4TasteVector(
      { anchors: [], ratings: [{ titleId: 't1', rating: 10 }] },
      descriptors,
    );

    const central = taste.themesByWeight.get('central-theme') ?? 0;
    const secondary = taste.themesByWeight.get('secondary-theme') ?? 0;
    expect(central).toBeGreaterThan(secondary);
  });

  it('aggregates the same theme across multiple rated titles (sum of contributions)', () => {
    // Two rated titles, both carrying `tragedy` at full confidence and
    // rating 10. The combined weight must exceed either single-title
    // contribution.
    const descriptors = new Map<string, V4Descriptor>([
      ['t1', desc([{ slug: 'tragedy', confidence: 1.0 }])],
      ['t2', desc([{ slug: 'tragedy', confidence: 1.0 }])],
    ]);
    const single = buildV4TasteVector(
      { anchors: [], ratings: [{ titleId: 't1', rating: 10 }] },
      descriptors,
    );
    const both = buildV4TasteVector(
      {
        anchors: [],
        ratings: [
          { titleId: 't1', rating: 10 },
          { titleId: 't2', rating: 10 },
        ],
      },
      descriptors,
    );
    const singleWeight = single.themesByWeight.get('tragedy') ?? 0;
    const bothWeight = both.themesByWeight.get('tragedy') ?? 0;

    expect(bothWeight).toBeGreaterThan(singleWeight);
  });

  it('silently skips a title in history that has no descriptor (no crash, no contribution)', () => {
    const descriptors = new Map<string, V4Descriptor>([
      ['known', desc([{ slug: 'tragedy', confidence: 1.0 }])],
    ]);
    const run = (): V4TasteVector =>
      buildV4TasteVector(
        {
          anchors: [{ titleId: 'known' }, { titleId: 'missingAnchor' }],
          ratings: [
            { titleId: 'known', rating: 10 },
            { titleId: 'missingRated', rating: 8 },
          ],
        },
        descriptors,
      );

    expect(run).not.toThrow();
    const taste = run();
    // Only `known`'s themes appear.
    expect((taste.themesByWeight.get('tragedy') ?? 0) > 0).toBe(true);
    expect(taste.themesByWeight.size).toBe(1);
  });

  it('returns an empty taste vector when no history entry has a matching descriptor', () => {
    // History references titles whose descriptors aren't in the map → nothing
    // accumulates. Should not crash, should yield empty maps.
    const descriptors = new Map<string, V4Descriptor>();
    const taste = buildV4TasteVector(
      {
        anchors: [{ titleId: 'noDesc' }],
        ratings: [{ titleId: 'alsoNoDesc', rating: 9 }],
      },
      descriptors,
    );

    expect(taste.themesByWeight.size).toBe(0);
    expect(taste.modePref.size).toBe(0);
    expect(taste.engagementPref.size).toBe(0);
    expect(taste.stakesPref.size).toBe(0);
  });
});

describe('recommendForUser with V4 — backward compatibility', () => {
  it('produces identical scores to the no-v4 call when v4 is omitted', () => {
    // Defensive backward-compat: absence of the v4 parameter must reduce
    // exactly to V1 behaviour.
    const taste: UserTasteVector = new Map([
      ['actionT', 100],
      ['mechaT', 80],
    ]);
    const candidates: TitleTagSet[] = [
      {
        titleId: 'a',
        tags: [
          { tagId: 'actionT', weight: 70 },
          { tagId: 'mechaT', weight: 60 },
        ],
      },
      { titleId: 'b', tags: [{ tagId: 'actionT', weight: 50 }] },
      { titleId: 'c', tags: [{ tagId: 'romanceT', weight: 90 }] },
    ];

    const v1 = recommendForUser(taste, candidates);
    const v1Again = recommendForUser(taste, candidates, undefined, []);

    expect(v1Again).toEqual(v1);
  });
});

describe('recommendForUser with V4 — theme overlap', () => {
  it('ranks a candidate whose V4 themes match user taste above one with no V4 themes', () => {
    // User loves tragedy + coming-of-age. Both candidates have identical V1
    // tag overlap (zero) — only V4 signal differentiates them.
    const v1Taste: UserTasteVector = EMPTY_TASTE;
    const v4Taste: V4TasteVector = {
      themesByWeight: new Map([
        ['tragedy', 1.5],
        ['coming-of-age', 1.2],
      ]),
      modePref: new Map(),
      engagementPref: new Map(),
      stakesPref: new Map(),
    };
    const candidateDescriptors = new Map<string, V4Descriptor>([
      [
        'matchesThemes',
        desc([
          { slug: 'tragedy', confidence: 1.0 },
          { slug: 'coming-of-age', confidence: 0.9 },
        ]),
      ],
      // No descriptor for `noDescriptor` — it gets only the V1 base score (0).
    ]);
    const candidates: TitleTagSet[] = [titleNoTags('matchesThemes'), titleNoTags('noDescriptor')];
    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors,
      comparableEdges: [],
      userRatings: EMPTY_RATINGS,
    };

    const result = recommendForUser(v1Taste, candidates, undefined, [], v4);

    expect(result[0]?.titleId).toBe('matchesThemes');
    expect(result[1]?.titleId).toBe('noDescriptor');
    expect((result[0]?.score ?? 0) > (result[1]?.score ?? 0)).toBe(true);
  });

  it('penalises (ranks lower) a candidate whose V4 theme is in the user`s negative-weight themes', () => {
    // Per ADR-0027: "Negative user weights (from disliked titles) subtract."
    // A candidate carrying the same theme as a disliked title should rank
    // BELOW a neutral candidate carrying no overlap.
    const v4Taste: V4TasteVector = {
      themesByWeight: new Map([['tragedy', -2.0]]), // strongly disliked
      modePref: new Map(),
      engagementPref: new Map(),
      stakesPref: new Map(),
    };
    const candidateDescriptors = new Map<string, V4Descriptor>([
      ['hasDislikedTheme', desc([{ slug: 'tragedy', confidence: 1.0 }])],
      ['hasUnrelatedTheme', desc([{ slug: 'cooking', confidence: 1.0 }])],
    ]);
    const candidates: TitleTagSet[] = [
      titleNoTags('hasDislikedTheme'),
      titleNoTags('hasUnrelatedTheme'),
    ];
    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors,
      comparableEdges: [],
      userRatings: EMPTY_RATINGS,
    };

    const result = recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);
    const dislikedIdx = result.findIndex((r) => r.titleId === 'hasDislikedTheme');
    const unrelatedIdx = result.findIndex((r) => r.titleId === 'hasUnrelatedTheme');

    expect(unrelatedIdx).toBeLessThan(dislikedIdx);
    const dislikedScore = result.find((r) => r.titleId === 'hasDislikedTheme')?.score ?? 0;
    expect(dislikedScore).toBeLessThan(0);
  });

  it('a candidate missing a descriptor still scores via the comparable-graph when an edge connects it to a rated title', () => {
    // Per the v4Score JSDoc: comparableScore fires even when the candidate
    // has no V4 descriptor (edges are title-id-keyed, descriptor-independent).
    // theme + enum-fit need the descriptor — those are 0 for this candidate.
    const v4Taste: V4TasteVector = {
      themesByWeight: new Map(),
      modePref: new Map(),
      engagementPref: new Map(),
      stakesPref: new Map(),
    };
    const userRatings = new Map<string, number>([['ratedLoved', 1.0]]);
    // Edge: rated title → candidate. Candidate is the recommended one.
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'ratedLoved', toTitleId: 'candNoDesc', position: 0 },
    ];
    const candidates: TitleTagSet[] = [titleNoTags('candNoDesc'), titleNoTags('candUnrelated')];
    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors: new Map(), // No descriptor for ANY candidate.
      comparableEdges,
      userRatings,
    };

    const result = recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);

    expect(result[0]?.titleId).toBe('candNoDesc');
    expect(result[1]?.titleId).toBe('candUnrelated');
    expect((result[0]?.score ?? 0) > (result[1]?.score ?? 0)).toBe(true);
  });
});

describe('recommendForUser with V4 — comparable-titles graph', () => {
  it('boosts a candidate that is comparable to a title the user RATED POSITIVELY', () => {
    const userRatings = new Map<string, number>([['lovedShow', 1.0]]);
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'lovedShow', toTitleId: 'comparable', position: 0 },
    ];
    const candidates: TitleTagSet[] = [titleNoTags('comparable'), titleNoTags('unrelated')];
    const v4: V4RecInputs = {
      taste: {
        themesByWeight: new Map(),
        modePref: new Map(),
        engagementPref: new Map(),
        stakesPref: new Map(),
      },
      candidateDescriptors: new Map(),
      comparableEdges,
      userRatings,
    };

    const result = recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);

    expect(result[0]?.titleId).toBe('comparable');
    expect(result[1]?.titleId).toBe('unrelated');
    expect((result[0]?.score ?? 0) > 0).toBe(true);
  });

  it('PENALISES (negative contribution) a candidate that is comparable to a title the user RATED NEGATIVELY', () => {
    // Rating valence flows through per ADR-0027:
    // "a user who DISLIKED title X (negative delta) should NOT see X's
    //  comparables boosted — they should be PENALISED."
    const userRatings = new Map<string, number>([['hatedShow', -1.0]]);
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'hatedShow', toTitleId: 'comparable', position: 0 },
    ];
    const candidates: TitleTagSet[] = [titleNoTags('comparable'), titleNoTags('unrelated')];
    const v4: V4RecInputs = {
      taste: {
        themesByWeight: new Map(),
        modePref: new Map(),
        engagementPref: new Map(),
        stakesPref: new Map(),
      },
      candidateDescriptors: new Map(),
      comparableEdges,
      userRatings,
    };

    const result = recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);
    const comparable = result.find((r) => r.titleId === 'comparable');
    const unrelated = result.find((r) => r.titleId === 'unrelated');

    expect((comparable?.score ?? 0) < 0).toBe(true);
    expect(unrelated?.score).toBe(0);
    // The unrelated one must rank above the penalised comparable.
    const idxComparable = result.findIndex((r) => r.titleId === 'comparable');
    const idxUnrelated = result.findIndex((r) => r.titleId === 'unrelated');
    expect(idxUnrelated).toBeLessThan(idxComparable);
  });

  it('weights position-0 edges more heavily than position-4 edges from the same rated title', () => {
    // The LLM's rank order (0..4) for comparable strength; lower = closer.
    // Holding rating fixed, the position-0 candidate must outrank position-4.
    const userRatings = new Map<string, number>([['lovedShow', 1.0]]);
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'lovedShow', toTitleId: 'closeComparable', position: 0 },
      { fromTitleId: 'lovedShow', toTitleId: 'farComparable', position: 4 },
    ];
    const candidates: TitleTagSet[] = [
      titleNoTags('closeComparable'),
      titleNoTags('farComparable'),
    ];
    const v4: V4RecInputs = {
      taste: {
        themesByWeight: new Map(),
        modePref: new Map(),
        engagementPref: new Map(),
        stakesPref: new Map(),
      },
      candidateDescriptors: new Map(),
      comparableEdges,
      userRatings,
    };

    const result = recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);

    expect(result[0]?.titleId).toBe('closeComparable');
    expect(result[1]?.titleId).toBe('farComparable');
    // Both are positively boosted but position 0 > position 4.
    expect((result[0]?.score ?? 0) > (result[1]?.score ?? 0)).toBe(true);
    expect((result[1]?.score ?? 0) > 0).toBe(true);
  });

  it('bidirectional: an edge candidate→rated AND an edge rated→candidate BOTH contribute', () => {
    // ADR-0027: "comparableScore = bidirectional walk on resolved-FK edges."
    // The graph walk fires whether the candidate is the from-side or the
    // to-side of the edge.
    const userRatings = new Map<string, number>([['ratedTitle', 1.0]]);
    const inboundCand = 'cInbound'; // edge: rated → cInbound
    const outboundCand = 'cOutbound'; // edge: cOutbound → rated
    const unrelatedCand = 'cUnrelated';
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'ratedTitle', toTitleId: inboundCand, position: 0 },
      { fromTitleId: outboundCand, toTitleId: 'ratedTitle', position: 0 },
    ];
    const candidates: TitleTagSet[] = [
      titleNoTags(inboundCand),
      titleNoTags(outboundCand),
      titleNoTags(unrelatedCand),
    ];
    const v4: V4RecInputs = {
      taste: {
        themesByWeight: new Map(),
        modePref: new Map(),
        engagementPref: new Map(),
        stakesPref: new Map(),
      },
      candidateDescriptors: new Map(),
      comparableEdges,
      userRatings,
    };

    const result = recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);
    const inbound = result.find((r) => r.titleId === inboundCand);
    const outbound = result.find((r) => r.titleId === outboundCand);
    const unrelated = result.find((r) => r.titleId === unrelatedCand);

    // Both directions must yield positive contribution.
    expect((inbound?.score ?? 0) > 0).toBe(true);
    expect((outbound?.score ?? 0) > 0).toBe(true);
    // The unrelated candidate (no edge) sits at 0.
    expect(unrelated?.score).toBe(0);
    // Both edged candidates rank above the unrelated.
    const ids = result.map((r) => r.titleId);
    const idxUnrelated = ids.indexOf(unrelatedCand);
    expect(ids.indexOf(inboundCand)).toBeLessThan(idxUnrelated);
    expect(ids.indexOf(outboundCand)).toBeLessThan(idxUnrelated);
  });

  it('a candidate with no comparable-graph edges and no descriptor scores 0 from V4', () => {
    // Sanity check for the "neutral baseline" — a candidate with no V4
    // signal anywhere should get exactly the V1 score (which is 0 here).
    const v4: V4RecInputs = {
      taste: {
        themesByWeight: new Map([['tragedy', 1.0]]),
        modePref: new Map(),
        engagementPref: new Map(),
        stakesPref: new Map(),
      },
      candidateDescriptors: new Map(),
      comparableEdges: [],
      userRatings: new Map(),
    };
    const candidates: TitleTagSet[] = [titleNoTags('noSignal')];

    const result = recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);
    expect(result[0]?.score).toBe(0);
  });
});

describe('recommendForUser with V4 — enum fit', () => {
  it('ranks a candidate whose narrative_mode matches user`s preferred mode above one that does not', () => {
    // User has signal that "deconstructs" is their preferred mode; one
    // candidate matches, one is `plays-straight` (user has no preference
    // signal for it). Match should outrank no-match.
    const v4Taste: V4TasteVector = {
      themesByWeight: new Map(),
      modePref: new Map([['deconstructs', 2.0]]),
      engagementPref: new Map(),
      stakesPref: new Map(),
    };
    const candidateDescriptors = new Map<string, V4Descriptor>([
      ['decon', desc([], 'deconstructs', 'medium', 'interpersonal')],
      ['straight', desc([], 'plays-straight', 'medium', 'interpersonal')],
    ]);
    const candidates: TitleTagSet[] = [titleNoTags('decon'), titleNoTags('straight')];
    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors,
      comparableEdges: [],
      userRatings: EMPTY_RATINGS,
    };

    const result = recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);

    expect(result[0]?.titleId).toBe('decon');
    expect(result[1]?.titleId).toBe('straight');
  });

  it('three matched enum buckets contribute more than one matched enum bucket', () => {
    // User has preference signal on all three enum axes. A candidate that
    // matches all three should outrank one that matches only narrativeMode.
    const v4Taste: V4TasteVector = {
      themesByWeight: new Map(),
      modePref: new Map([['deconstructs', 2.0]]),
      engagementPref: new Map([['high', 2.0]]),
      stakesPref: new Map([['cosmic', 2.0]]),
    };
    const candidateDescriptors = new Map<string, V4Descriptor>([
      ['allThree', desc([], 'deconstructs', 'high', 'cosmic')],
      ['justMode', desc([], 'deconstructs', 'low', 'interpersonal')],
    ]);
    const candidates: TitleTagSet[] = [titleNoTags('allThree'), titleNoTags('justMode')];
    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors,
      comparableEdges: [],
      userRatings: EMPTY_RATINGS,
    };

    const result = recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);

    expect(result[0]?.titleId).toBe('allThree');
    expect(result[1]?.titleId).toBe('justMode');
  });

  it('enum-fit on a NEGATIVE-weight bucket pulls the candidate below a neutral candidate', () => {
    // The user has consistently rated `parodies` titles poorly → modePref
    // for `parodies` is negative. A candidate that's `parodies` should
    // rank below a candidate matching no enum signal.
    const v4Taste: V4TasteVector = {
      themesByWeight: new Map(),
      modePref: new Map([['parodies', -2.0]]),
      engagementPref: new Map(),
      stakesPref: new Map(),
    };
    const candidateDescriptors = new Map<string, V4Descriptor>([
      ['parodyCand', desc([], 'parodies', 'medium', 'interpersonal')],
      ['neutralCand', desc([], 'hybrid', 'medium', 'interpersonal')],
    ]);
    const candidates: TitleTagSet[] = [titleNoTags('parodyCand'), titleNoTags('neutralCand')];
    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors,
      comparableEdges: [],
      userRatings: EMPTY_RATINGS,
    };

    const result = recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);
    const parodyIdx = result.findIndex((r) => r.titleId === 'parodyCand');
    const neutralIdx = result.findIndex((r) => r.titleId === 'neutralCand');

    expect(neutralIdx).toBeLessThan(parodyIdx);
    const parodyScore = result.find((r) => r.titleId === 'parodyCand')?.score ?? 0;
    const neutralScore = result.find((r) => r.titleId === 'neutralCand')?.score ?? 0;
    expect(parodyScore).toBeLessThan(neutralScore);
  });
});

describe('recommendForUser with V4 — cold-start + determinism', () => {
  it('handles a fully-empty V4 signal (empty taste, no descriptors, no edges, no ratings) without throwing and orders by titleId ASC', () => {
    const emptyV4Taste: V4TasteVector = {
      themesByWeight: new Map(),
      modePref: new Map(),
      engagementPref: new Map(),
      stakesPref: new Map(),
    };
    const candidates: TitleTagSet[] = [
      titleNoTags('zeta'),
      titleNoTags('alpha'),
      titleNoTags('beta'),
    ];
    const v4: V4RecInputs = {
      taste: emptyV4Taste,
      candidateDescriptors: new Map(),
      comparableEdges: [],
      userRatings: EMPTY_RATINGS,
    };

    const run = (): ReturnType<typeof recommendForUser> =>
      recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);

    expect(run).not.toThrow();
    const result = run();
    expect(result.map((r) => r.titleId)).toEqual(['alpha', 'beta', 'zeta']);
    expect(result.every((r) => r.score === 0)).toBe(true);
  });

  it('breaks score ties deterministically by titleId ASC when V4 signal is identical for two candidates', () => {
    // Two candidates with identical V4 descriptors and no comparable edges
    // — must tie on V4 contribution and tie-break by titleId ASC. Lock in
    // both input orderings.
    const v4Taste: V4TasteVector = {
      themesByWeight: new Map([['tragedy', 1.0]]),
      modePref: new Map(),
      engagementPref: new Map(),
      stakesPref: new Map(),
    };
    const sameDesc = desc([{ slug: 'tragedy', confidence: 1.0 }]);
    const candidateDescriptors = new Map<string, V4Descriptor>([
      ['zebra', sameDesc],
      ['apple', sameDesc],
    ]);

    const orderA: TitleTagSet[] = [titleNoTags('zebra'), titleNoTags('apple')];
    const orderB: TitleTagSet[] = [titleNoTags('apple'), titleNoTags('zebra')];

    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors,
      comparableEdges: [],
      userRatings: EMPTY_RATINGS,
    };

    const resA = recommendForUser(EMPTY_TASTE, orderA, undefined, [], v4).map((r) => r.titleId);
    const resB = recommendForUser(EMPTY_TASTE, orderB, undefined, [], v4).map((r) => r.titleId);

    expect(resA).toEqual(['apple', 'zebra']);
    expect(resB).toEqual(['apple', 'zebra']);
  });
});

describe('recommendForGroup with V4', () => {
  const v4TasteOf = (
    themes: ReadonlyArray<readonly [string, number]> = [],
    mode: ReadonlyArray<readonly [string, number]> = [],
    eng: ReadonlyArray<readonly [string, number]> = [],
    stakes: ReadonlyArray<readonly [string, number]> = [],
  ): V4TasteVector => ({
    themesByWeight: new Map(themes),
    modePref: new Map(mode),
    engagementPref: new Map(eng),
    stakesPref: new Map(stakes),
  });

  it('members with different V4 tastes produce different per-user scores for the same candidate', () => {
    // Alice loves tragedy. Bob loves cooking. A tragedy candidate must
    // score higher for Alice than for Bob in `perUserScores`.
    const members: GroupMember[] = [
      { userId: 'alice', taste: EMPTY_TASTE },
      { userId: 'bob', taste: EMPTY_TASTE },
    ];
    const aliceTaste = v4TasteOf([['tragedy', 2.0]]);
    const bobTaste = v4TasteOf([['cooking', 2.0]]);
    const candidateDescriptors = new Map<string, V4Descriptor>([
      ['tragedyShow', desc([{ slug: 'tragedy', confidence: 1.0 }])],
      // A second candidate so neither member's maxRaw is 0 (otherwise
      // norms degenerate to 0).
      ['cookingShow', desc([{ slug: 'cooking', confidence: 1.0 }])],
    ]);
    const candidates: TitleTagSet[] = [titleNoTags('tragedyShow'), titleNoTags('cookingShow')];
    const v4: V4GroupInputs = {
      memberTastes: new Map([
        ['alice', aliceTaste],
        ['bob', bobTaste],
      ]),
      memberRatings: new Map([
        ['alice', new Map()],
        ['bob', new Map()],
      ]),
      candidateDescriptors,
      comparableEdges: [],
    };

    const result = recommendForGroup(
      members,
      candidates,
      { vetoThreshold: 0, lambda: 0 },
      [],
      undefined,
      v4,
    );
    const tragedyRec = result.find((r) => r.titleId === 'tragedyShow');
    const aliceOnTragedy = tragedyRec?.perUserScores.get('alice') ?? 0;
    const bobOnTragedy = tragedyRec?.perUserScores.get('bob') ?? 0;

    expect(aliceOnTragedy).toBeGreaterThan(bobOnTragedy);
  });

  it('V4 enum signal flows through to the AWM veto: a candidate one member`s V4 strongly dislikes is vetoed', () => {
    // Strong divergence on V4: Alice's modePref strongly likes
    // `deconstructs`; Bob strongly dislikes it (negative modePref) but
    // likes `plays-straight`.
    //
    // Bob's normalised score on the deconstruction candidate goes
    // strongly negative (his raw is the V4_ENUM_WEIGHT × -2.0 = -0.6 vs
    // his personal max of +0.6 on the neutral show; norm = -1.0). At
    // vetoThreshold = 0, norm < 0 → vetoed. The neutral show (positive
    // for Bob, neutral for Alice) survives.
    //
    // Both members carry a placeholder themesByWeight entry so the
    // cold-start guard (which keys off themesByWeight only) does not
    // abstain them from veto. The substantive V4 signal lives in modePref.
    const members: GroupMember[] = [
      { userId: 'alice', taste: EMPTY_TASTE },
      { userId: 'bob', taste: EMPTY_TASTE },
    ];
    const aliceTaste = v4TasteOf([['placeholder-theme', 0.01]], [['deconstructs', 2.0]]);
    const bobTaste = v4TasteOf(
      [['placeholder-theme', 0.01]],
      [
        ['deconstructs', -2.0],
        ['plays-straight', 2.0],
      ],
    );
    const candidateDescriptors = new Map<string, V4Descriptor>([
      ['deconShow', desc([], 'deconstructs', 'medium', 'interpersonal')],
      ['neutralShow', desc([], 'plays-straight', 'medium', 'interpersonal')],
    ]);
    const candidates: TitleTagSet[] = [titleNoTags('deconShow'), titleNoTags('neutralShow')];
    const v4: V4GroupInputs = {
      memberTastes: new Map([
        ['alice', aliceTaste],
        ['bob', bobTaste],
      ]),
      memberRatings: new Map([
        ['alice', new Map()],
        ['bob', new Map()],
      ]),
      candidateDescriptors,
      comparableEdges: [],
    };

    const result = recommendForGroup(
      members,
      candidates,
      { vetoThreshold: 0, lambda: 0 },
      [],
      undefined,
      v4,
    );
    const ids = result.map((r) => r.titleId);

    // The neutral show survives; Bob's strong dislike of the
    // deconstruction (modePref = -2.0) vetoes it.
    expect(ids).toContain('neutralShow');
    expect(ids).not.toContain('deconShow');
  });

  it('true cold-start member (empty V1 taste + empty V4 signal) abstains from veto', () => {
    // Alice has V1+V4 taste; Bob is brand new — empty V1 taste, empty V4
    // taste. Per the JSDoc cold-start guard, Bob abstains from veto so
    // Alice's preferred candidate must survive even at vetoThreshold=0.5.
    const members: GroupMember[] = [
      {
        userId: 'alice',
        taste: new Map([
          ['actionT', 100],
          ['mechaT', 80],
        ]),
      },
      { userId: 'bob', taste: EMPTY_TASTE },
    ];
    const aliceV4 = v4TasteOf([['tragedy', 2.0]]);
    const bobV4 = v4TasteOf(); // empty everywhere → true cold-start
    const candidateDescriptors = new Map<string, V4Descriptor>([
      ['aliceTopV4', desc([{ slug: 'tragedy', confidence: 1.0 }])],
    ]);
    const candidates: TitleTagSet[] = [
      {
        titleId: 'aliceTopV4',
        tags: [
          { tagId: 'actionT', weight: 80 },
          { tagId: 'mechaT', weight: 70 },
        ],
      },
    ];
    const v4: V4GroupInputs = {
      memberTastes: new Map([
        ['alice', aliceV4],
        ['bob', bobV4],
      ]),
      memberRatings: new Map([
        ['alice', new Map()],
        ['bob', new Map()],
      ]),
      candidateDescriptors,
      comparableEdges: [],
    };

    const result = recommendForGroup(
      members,
      candidates,
      { vetoThreshold: 0.5, lambda: 0 },
      [],
      undefined,
      v4,
    );

    expect(result.map((r) => r.titleId)).toContain('aliceTopV4');
  });

  it('a member with V4 signal but empty V1 taste PARTICIPATES in veto (not treated as cold-start)', () => {
    // Per the JSDoc: "A user with V4 descriptors aggregated from rated
    // titles has expressed preferences and should not be treated as
    // cold-start." This member must veto candidates that don't match
    // their V4 taste.
    //
    // Alice has V1 taste for action; Bob has only V4 signal — he loves
    // `tragedy`. With both members having SOME signal, no cold-start guard
    // applies for Bob. A candidate that scores only for Alice (no tragedy
    // theme, no cooking theme) should be vetoed by Bob at a positive
    // threshold because Bob's normalised score on it is 0.
    const members: GroupMember[] = [
      { userId: 'alice', taste: new Map([['actionT', 100]]) },
      { userId: 'bob', taste: EMPTY_TASTE },
    ];
    const aliceV4 = v4TasteOf();
    const bobV4 = v4TasteOf([['tragedy', 2.0]]);
    const candidateDescriptors = new Map<string, V4Descriptor>([
      ['bobsTragedy', desc([{ slug: 'tragedy', confidence: 1.0 }])],
      // No descriptor for `aliceOnly` — Bob's V4 contribution is 0 for it.
    ]);
    const candidates: TitleTagSet[] = [
      { titleId: 'aliceOnly', tags: [{ tagId: 'actionT', weight: 80 }] },
      { titleId: 'bobsTragedy', tags: [] },
    ];
    const v4: V4GroupInputs = {
      memberTastes: new Map([
        ['alice', aliceV4],
        ['bob', bobV4],
      ]),
      memberRatings: new Map([
        ['alice', new Map()],
        ['bob', new Map()],
      ]),
      candidateDescriptors,
      comparableEdges: [],
    };

    const result = recommendForGroup(
      members,
      candidates,
      { vetoThreshold: 0.5, lambda: 0 },
      [],
      undefined,
      v4,
    );
    const ids = result.map((r) => r.titleId);

    // `aliceOnly` is vetoed by Bob (his norm = 0). `bobsTragedy` survives
    // for Bob (his personal best, norm = 1) but is vetoed by Alice (norm = 0
    // on it). So BOTH candidates should be excluded.
    expect(ids).not.toContain('aliceOnly');
    expect(ids).not.toContain('bobsTragedy');
  });

  it('absence of V4 group input → group behaviour is identical to V1-only call', () => {
    // Backward-compat for the group function.
    const members: GroupMember[] = [
      { userId: 'alice', taste: new Map([['actionT', 100]]) },
      { userId: 'bob', taste: new Map([['actionT', 80]]) },
    ];
    const candidates: TitleTagSet[] = [
      { titleId: 'a', tags: [{ tagId: 'actionT', weight: 80 }] },
      { titleId: 'b', tags: [{ tagId: 'mechaT', weight: 80 }] },
    ];

    const withoutV4 = recommendForGroup(members, candidates, { vetoThreshold: 0, lambda: 0 });
    const withUndefinedV4 = recommendForGroup(
      members,
      candidates,
      { vetoThreshold: 0, lambda: 0 },
      [],
      undefined,
      undefined,
    );

    expect(withUndefinedV4.map((r) => r.titleId)).toEqual(withoutV4.map((r) => r.titleId));
  });

  it('a member with a NEGATIVE rating on title X ranks X`s comparables strictly below a positively-scoring candidate', () => {
    // Rating valence in the group context: Alice rated `hatedShow` at 1/10
    // (multiplier -1.0). A candidate that's comparable to `hatedShow`
    // receives a negative V4 contribution. Whether that candidate then
    // survives or is filtered out by the AWM veto floor is ambiguous in
    // the contract (V4 is the first place raw scores can go negative),
    // but the RANKING DIRECTION is unambiguous: Alice's loved-tag
    // candidate must outrank the comparable-to-hated candidate.
    //
    // We assert the top-of-ranking constraint (rather than per-user score
    // comparisons that depend on the negative candidate surviving).
    const members: GroupMember[] = [{ userId: 'alice', taste: new Map([['actionT', 100]]) }];
    const aliceV4 = v4TasteOf();
    const aliceRatings = new Map<string, number>([['hatedShow', -1.0]]);
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'hatedShow', toTitleId: 'comparableToHated', position: 0 },
    ];
    const candidates: TitleTagSet[] = [
      { titleId: 'aliceLoves', tags: [{ tagId: 'actionT', weight: 100 }] },
      { titleId: 'comparableToHated', tags: [] },
    ];
    const v4: V4GroupInputs = {
      memberTastes: new Map([['alice', aliceV4]]),
      memberRatings: new Map([['alice', aliceRatings]]),
      candidateDescriptors: new Map(),
      comparableEdges,
    };

    const result = recommendForGroup(
      members,
      candidates,
      { vetoThreshold: 0, lambda: 0 },
      [],
      undefined,
      v4,
    );

    // The loved candidate must be in the output and at the top.
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.titleId).toBe('aliceLoves');

    // Either the comparable-to-hated candidate is vetoed (not in output)
    // OR it survives with a lower per-user score than the loved candidate.
    const comparable = result.find((r) => r.titleId === 'comparableToHated');
    const loved = result.find((r) => r.titleId === 'aliceLoves');
    if (comparable !== undefined) {
      const lovedScore = loved?.perUserScores.get('alice') ?? 0;
      const comparableScore = comparable.perUserScores.get('alice') ?? 0;
      expect(lovedScore).toBeGreaterThan(comparableScore);
    }
  });
});
