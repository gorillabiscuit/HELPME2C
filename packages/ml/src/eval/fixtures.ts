// Synthetic group + candidate fixtures for the eval harness. The five
// archetypes here are the ADR-0020 §required-before-code list; each one
// pressures a specific failure mode of group recommendation.
//
// Tag-id convention: `t:<medium>:<concept>` so it's obvious from the id
// alone which medium and concept a tag represents. Real production tag
// ids are UUIDs — we use named ids in the harness for readability of
// failed assertions.
//
// Theme-id convention: `th:<concept>` mirroring the production
// themes.slug shape.

import type { SyntheticGroup, SyntheticScenario } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const taste = (entries: ReadonlyArray<readonly [string, number]>): ReadonlyMap<string, number> =>
  new Map(entries);

// ---------------------------------------------------------------------------
// Theme membership shared across scenarios
// ---------------------------------------------------------------------------

const SHARED_THEMES = [
  // Cross-medium tragedy — bridges TMDB:tragedy and AniList:Tragedy
  { tagId: 't:tmdb:tragedy', themeId: 'th:tragedy', strength: 100 },
  { tagId: 't:anilist:Tragedy', themeId: 'th:tragedy', strength: 100 },
  // Cross-medium revenge
  { tagId: 't:tmdb:revenge', themeId: 'th:revenge', strength: 100 },
  { tagId: 't:anilist:Revenge', themeId: 'th:revenge', strength: 100 },
  // Cross-medium school-life (broader bridge)
  { tagId: 't:tmdb:school', themeId: 'th:school-life', strength: 100 },
  { tagId: 't:anilist:School', themeId: 'th:school-life', strength: 100 },
  { tagId: 't:tmdb:high school', themeId: 'th:school-life', strength: 80 },
  // Cross-medium super-power
  { tagId: 't:tmdb:super power', themeId: 'th:super-power', strength: 100 },
  { tagId: 't:anilist:Super Power', themeId: 'th:super-power', strength: 100 },
  // Cross-medium war
  { tagId: 't:tmdb:war', themeId: 'th:war', strength: 100 },
  { tagId: 't:anilist:War', themeId: 'th:war', strength: 100 },
  // Cross-medium space
  { tagId: 't:tmdb:space opera', themeId: 'th:space', strength: 100 },
  { tagId: 't:anilist:Space', themeId: 'th:space', strength: 100 },
] as const;

// ---------------------------------------------------------------------------
// Candidate pools — built once, reused across archetypes via slicing.
// Each candidate carries 3-5 tags, weight 100, mirroring real-world shape.
// Mix of TV, anime, and a few cross-medium-bridge candidates.
// ---------------------------------------------------------------------------

const TV_CANDIDATES = [
  {
    titleId: 'tv-tragic-revenge',
    tags: [
      { tagId: 't:tmdb:tragedy', weight: 100 },
      { tagId: 't:tmdb:revenge', weight: 100 },
      { tagId: 't:tmdb:antihero', weight: 80 },
    ],
  },
  {
    titleId: 'tv-school-drama',
    tags: [
      { tagId: 't:tmdb:school', weight: 100 },
      { tagId: 't:tmdb:high school', weight: 100 },
      { tagId: 't:tmdb:drama', weight: 90 },
    ],
  },
  {
    titleId: 'tv-superhero',
    tags: [
      { tagId: 't:tmdb:super power', weight: 100 },
      { tagId: 't:tmdb:antihero', weight: 80 },
      { tagId: 't:tmdb:action', weight: 100 },
    ],
  },
  {
    titleId: 'tv-war-drama',
    tags: [
      { tagId: 't:tmdb:war', weight: 100 },
      { tagId: 't:tmdb:tragedy', weight: 80 },
      { tagId: 't:tmdb:military', weight: 100 },
    ],
  },
  {
    titleId: 'tv-space-opera',
    tags: [
      { tagId: 't:tmdb:space opera', weight: 100 },
      { tagId: 't:tmdb:adventure', weight: 90 },
    ],
  },
  {
    titleId: 'tv-comedy-sitcom',
    tags: [
      { tagId: 't:tmdb:comedy', weight: 100 },
      { tagId: 't:tmdb:family', weight: 80 },
      { tagId: 't:tmdb:slice of life', weight: 70 },
    ],
  },
  {
    titleId: 'tv-procedural-crime',
    tags: [
      { tagId: 't:tmdb:crime', weight: 100 },
      { tagId: 't:tmdb:detective', weight: 100 },
      { tagId: 't:tmdb:mystery', weight: 90 },
    ],
  },
];

const ANIME_CANDIDATES = [
  {
    titleId: 'an-tragic-revenge',
    tags: [
      { tagId: 't:anilist:Tragedy', weight: 100 },
      { tagId: 't:anilist:Revenge', weight: 100 },
      { tagId: 't:anilist:Anti-Hero', weight: 90 },
    ],
  },
  {
    titleId: 'an-school-life',
    tags: [
      { tagId: 't:anilist:School', weight: 100 },
      { tagId: 't:anilist:Slice of Life', weight: 90 },
      { tagId: 't:anilist:Romance', weight: 80 },
    ],
  },
  {
    titleId: 'an-superpower',
    tags: [
      { tagId: 't:anilist:Super Power', weight: 100 },
      { tagId: 't:anilist:Anti-Hero', weight: 80 },
      { tagId: 't:anilist:Action', weight: 100 },
    ],
  },
  {
    titleId: 'an-mecha-war',
    tags: [
      { tagId: 't:anilist:War', weight: 100 },
      { tagId: 't:anilist:Mecha', weight: 100 },
      { tagId: 't:anilist:Tragedy', weight: 80 },
    ],
  },
  {
    titleId: 'an-space-opera',
    tags: [
      { tagId: 't:anilist:Space', weight: 100 },
      { tagId: 't:anilist:Adventure', weight: 90 },
    ],
  },
  {
    titleId: 'an-romance-comedy',
    tags: [
      { tagId: 't:anilist:Romance', weight: 100 },
      { tagId: 't:anilist:Comedy', weight: 100 },
      { tagId: 't:anilist:Slice of Life', weight: 80 },
    ],
  },
  {
    titleId: 'an-mystery',
    tags: [
      { tagId: 't:anilist:Mystery', weight: 100 },
      { tagId: 't:anilist:Detective', weight: 90 },
    ],
  },
];

const ALL_CANDIDATES = [...TV_CANDIDATES, ...ANIME_CANDIDATES];

// ---------------------------------------------------------------------------
// Archetype 1: Compatible couple
// Both members have heavy overlap. AWM should produce high-mean,
// low-stddev recs. The veto floor and disagreement penalty barely bite.
// ---------------------------------------------------------------------------

const COMPATIBLE_COUPLE: SyntheticGroup = {
  archetype: 'compatible-couple',
  description:
    'Two members with strongly overlapping TV taste — should produce high-mean, low-stddev recs across veto/lambda settings.',
  members: [
    {
      userId: 'alice',
      taste: taste([
        ['t:tmdb:tragedy', 100],
        ['t:tmdb:revenge', 80],
        ['t:tmdb:antihero', 90],
        ['t:tmdb:crime', 70],
      ]),
    },
    {
      userId: 'bob',
      taste: taste([
        ['t:tmdb:tragedy', 90],
        ['t:tmdb:revenge', 100],
        ['t:tmdb:antihero', 80],
        ['t:tmdb:drama', 70],
      ]),
    },
  ],
};

// ---------------------------------------------------------------------------
// Archetype 2: Diverse couple, bridgeable
// Different but overlapping interests — Alice leans dark drama, Bob leans
// bright comedy. Some cross-genre candidates exist. Tests whether the
// disagreement penalty correctly favours middle-ground over polarising.
// ---------------------------------------------------------------------------

const DIVERSE_COUPLE: SyntheticGroup = {
  archetype: 'diverse-couple-bridgeable',
  description:
    'Two TV viewers with different but overlapping interests — Alice (dark drama) + Bob (bright comedy) — share some genres. Tests the disagreement penalty.',
  members: [
    {
      userId: 'alice',
      taste: taste([
        ['t:tmdb:tragedy', 100],
        ['t:tmdb:drama', 90],
        ['t:tmdb:crime', 80],
        ['t:tmdb:detective', 70],
      ]),
    },
    {
      userId: 'bob',
      taste: taste([
        ['t:tmdb:comedy', 100],
        ['t:tmdb:family', 80],
        ['t:tmdb:slice of life', 70],
        ['t:tmdb:drama', 60], // small overlap with Alice
      ]),
    },
  ],
};

// ---------------------------------------------------------------------------
// Archetype 3: Anime+TV mixed couple — the differentiator per ADR-0020
// Alice is a TV fan with NO anime tags. Bob is an anime fan with NO TV
// tags. They share zero tags. ONLY the cross-medium theme bridge can save
// them. Without the bridge: every candidate vetoed.
// ---------------------------------------------------------------------------

const ANIME_TV_MIXED: SyntheticGroup = {
  archetype: 'anime-tv-mixed-couple',
  description:
    'TV fan + anime fan, zero direct tag overlap. Cross-medium theme bridge is what makes group recs viable. Without bridge: vetoed empty.',
  members: [
    {
      userId: 'alice',
      taste: taste([
        ['t:tmdb:tragedy', 100],
        ['t:tmdb:revenge', 100],
        ['t:tmdb:war', 80],
        ['t:tmdb:super power', 70],
      ]),
    },
    {
      userId: 'bob',
      taste: taste([
        ['t:anilist:Tragedy', 100],
        ['t:anilist:Revenge', 90],
        ['t:anilist:Mecha', 80],
        ['t:anilist:Super Power', 70],
      ]),
    },
  ],
};

// ---------------------------------------------------------------------------
// Archetype 4: Family-with-constraint
// Three members. Parent has serious tastes; teen wants action; kid needs
// family-friendly content. The kid is the constraint — their taste vector
// produces vetoes on most adult-skewed candidates.
// ---------------------------------------------------------------------------

const FAMILY_WITH_CONSTRAINT: SyntheticGroup = {
  archetype: 'family-with-constraint',
  description:
    'Parent + teen + kid. The kid acts as a strict veto floor on adult-skewed candidates.',
  members: [
    {
      userId: 'parent',
      taste: taste([
        ['t:tmdb:drama', 100],
        ['t:tmdb:crime', 80],
        ['t:tmdb:detective', 70],
      ]),
    },
    {
      userId: 'teen',
      taste: taste([
        ['t:tmdb:action', 100],
        ['t:tmdb:super power', 90],
        ['t:tmdb:adventure', 80],
      ]),
    },
    {
      userId: 'kid',
      taste: taste([
        ['t:tmdb:family', 100],
        ['t:tmdb:comedy', 90],
        ['t:tmdb:slice of life', 80],
      ]),
    },
  ],
};

// ---------------------------------------------------------------------------
// Archetype 5: Incompatible couple
// Orthogonal tastes — no shared tags, no theme bridges that help. ADR-0020
// expects this to produce mostly empty output under any sensible veto
// threshold. This archetype is the "is the algorithm honest about its
// failure modes?" test.
// ---------------------------------------------------------------------------

const INCOMPATIBLE_COUPLE: SyntheticGroup = {
  archetype: 'incompatible-couple',
  description:
    'Two members with orthogonal tastes (no shared tags, no useful theme bridges). Algorithm should honestly produce few/no recs at sensible thresholds.',
  members: [
    {
      userId: 'alice',
      taste: taste([
        ['t:tmdb:tragedy', 100],
        ['t:tmdb:war', 90],
        ['t:tmdb:military', 80],
      ]),
    },
    {
      userId: 'bob',
      taste: taste([
        ['t:tmdb:comedy', 100],
        ['t:anilist:Romance', 90],
        ['t:anilist:Slice of Life', 80],
      ]),
    },
  ],
};

// ---------------------------------------------------------------------------
// Public surface — scenarios are bundled (group + candidates + themes)
// because some archetypes (mixed-medium especially) need both anime and
// TV candidates to pressure the algorithm meaningfully.
// ---------------------------------------------------------------------------

export const SCENARIO_COMPATIBLE_COUPLE: SyntheticScenario = {
  group: COMPATIBLE_COUPLE,
  candidates: ALL_CANDIDATES,
  themeMembership: [...SHARED_THEMES],
};

export const SCENARIO_DIVERSE_COUPLE: SyntheticScenario = {
  group: DIVERSE_COUPLE,
  candidates: ALL_CANDIDATES,
  themeMembership: [...SHARED_THEMES],
};

export const SCENARIO_ANIME_TV_MIXED: SyntheticScenario = {
  group: ANIME_TV_MIXED,
  candidates: ALL_CANDIDATES,
  themeMembership: [...SHARED_THEMES],
};

export const SCENARIO_FAMILY_WITH_CONSTRAINT: SyntheticScenario = {
  group: FAMILY_WITH_CONSTRAINT,
  candidates: ALL_CANDIDATES,
  themeMembership: [...SHARED_THEMES],
};

export const SCENARIO_INCOMPATIBLE_COUPLE: SyntheticScenario = {
  group: INCOMPATIBLE_COUPLE,
  candidates: ALL_CANDIDATES,
  themeMembership: [...SHARED_THEMES],
};

export const ALL_SCENARIOS: ReadonlyArray<SyntheticScenario> = [
  SCENARIO_COMPATIBLE_COUPLE,
  SCENARIO_DIVERSE_COUPLE,
  SCENARIO_ANIME_TV_MIXED,
  SCENARIO_FAMILY_WITH_CONSTRAINT,
  SCENARIO_INCOMPATIBLE_COUPLE,
];
