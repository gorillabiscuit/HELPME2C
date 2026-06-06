// Controlled thematic vocabulary for LLM theme extraction.
//
// The whole point of the LLM pass is to replace surface-level demographic
// tags ("Male Protagonist", "Shounen") with descriptors that say what a
// story is ABOUT. Free-form output produces drift ("revenge driven" vs
// "driven by revenge" vs "vengeance-themed") and kills cross-title theme
// matching. So we give the model a fixed list and constrain it to that.
//
// Gaps surface as misclassifications and get added to the vocabulary
// rather than being created on the fly.
//
// Structure: slug | facet | label | hint
//   - hint is sent to the LLM only (not to users) to disambiguate close-meaning slugs.
//   - facet is used by the scoring layer to weight and aggregate tags independently.
//
// Facet model (ADR-0026):
//   A — Topical Themes   : what the story is about
//   B — Structural Arc   : how the story is shaped (arc direction, pacing, protagonist arc)
//   C — Affective Texture: tonal register — how it feels to watch
//   D — Content Intensity: violence/sexual content flags (veto filters, not ranking signals)
//   E — Gratification    : hedonic vs. eudaimonic affordance
//
// Note: Facet D flags (violence-present, sexual-content-present) are NOT slugs in this
// vocabulary — they live as boolean fields on the content record. See ADR-0026.

export type ThemeFacet = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ThemeVocabEntry {
  readonly slug: string;
  readonly facet: ThemeFacet;
  readonly label: string;
  readonly hint: string;
}

export const THEME_VOCABULARY: ReadonlyArray<ThemeVocabEntry> = [
  // -------------------------------------------------------------------------
  // Facet A — Topical Themes (what the story is about)
  // -------------------------------------------------------------------------

  // Relationship & emotion
  {
    slug: 'found-family',
    facet: 'A',
    label: 'found family',
    hint: 'unrelated people becoming a chosen family',
  },
  {
    slug: 'grief-and-loss',
    facet: 'A',
    label: 'grief and loss',
    hint: 'mourning, processing death of a loved one',
  },
  {
    slug: 'forbidden-love',
    facet: 'A',
    label: 'forbidden love',
    hint: 'romantic connection across social/legal/family barriers',
  },
  {
    slug: 'coming-of-age',
    facet: 'A',
    label: 'coming of age',
    hint: 'transition from youth to adulthood; identity formation',
  },
  {
    slug: 'friendship-tested',
    facet: 'A',
    label: 'friendship tested',
    hint: 'long-standing bonds strained by conflict, betrayal, or loss',
  },
  {
    slug: 'parent-child-rift',
    facet: 'A',
    label: 'parent-child rift',
    hint: 'generational conflict, estrangement, attempts at reconciliation',
  },
  {
    slug: 'redemption-arc',
    facet: 'A',
    label: 'redemption arc',
    hint: 'a deeply flawed character earning their way back',
  },
  {
    slug: 'unrequited-longing',
    facet: 'A',
    label: 'unrequited longing',
    hint: 'one-sided love that shapes the protagonist',
  },
  {
    slug: 'toxic-relationship',
    facet: 'A',
    label: 'toxic relationship',
    hint: 'love that damages, codependency, abuse',
  },
  {
    slug: 'loneliness-and-isolation',
    facet: 'A',
    label: 'loneliness and isolation',
    hint: 'characters cut off from human connection',
  },
  {
    slug: 'platonic-soulmates',
    facet: 'A',
    label: 'platonic soulmates',
    hint: 'non-romantic deep bonds that drive the story',
  },

  // Power & society
  {
    slug: 'power-corrupts',
    facet: 'A',
    label: 'power corrupts',
    hint: 'moral decay that comes from holding power',
  },
  {
    slug: 'class-conflict',
    facet: 'A',
    label: 'class conflict',
    hint: 'inequality and friction between economic classes',
  },
  {
    slug: 'institutional-failure',
    facet: 'A',
    label: 'institutional failure',
    hint: 'when systems (police, courts, hospitals) fail the people they serve',
  },
  {
    slug: 'revolution-and-rebellion',
    facet: 'A',
    label: 'revolution and rebellion',
    hint: 'organised resistance against an established order',
  },
  {
    slug: 'corruption-and-cover-up',
    facet: 'A',
    label: 'corruption and cover-up',
    hint: 'exposing wrongdoing inside an institution',
  },
  {
    slug: 'propaganda-and-truth',
    facet: 'A',
    label: 'propaganda and truth',
    hint: 'manipulation of information, journalism, manufactured consent',
  },
  {
    slug: 'legacy-of-empire',
    facet: 'A',
    label: 'legacy of empire',
    hint: 'colonialism and post-colonial reckoning',
  },
  {
    slug: 'celebrity-and-fame',
    facet: 'A',
    label: 'celebrity and fame',
    hint: 'the cost of public visibility, image management, parasocial dynamics',
  },

  // Moral
  {
    slug: 'moral-compromise',
    facet: 'A',
    label: 'moral compromise',
    hint: 'protagonists making choices that erode their own values',
  },
  {
    slug: 'vigilante-justice',
    facet: 'A',
    label: 'vigilante justice',
    hint: "taking the law into one's own hands",
  },
  {
    slug: 'ethical-dilemma',
    facet: 'A',
    label: 'ethical dilemma',
    hint: 'unsolvable choices with no clean answer',
  },
  {
    slug: 'guilt-and-atonement',
    facet: 'A',
    label: 'guilt and atonement',
    hint: 'living with what one has done',
  },
  {
    slug: 'impossible-choice',
    facet: 'A',
    label: 'impossible choice',
    hint: 'lose-lose scenarios that drive the plot',
  },
  {
    slug: 'betrayal-and-forgiveness',
    facet: 'A',
    label: 'betrayal and forgiveness',
    hint: 'central betrayal and the question of whether to forgive',
  },
  {
    slug: 'vengeance-and-its-cost',
    facet: 'A',
    label: 'vengeance and its cost',
    hint: 'revenge as the engine, and what it takes from the avenger',
  },
  {
    slug: 'complicity-with-evil',
    facet: 'A',
    label: 'complicity with evil',
    hint: 'ordinary people participating in atrocity',
  },

  // Identity & self
  {
    slug: 'identity-crisis',
    facet: 'A',
    label: 'identity crisis',
    hint: 'who am I, fundamentally?',
  },
  {
    slug: 'coming-out',
    facet: 'A',
    label: 'coming out',
    hint: "revealing one's identity (queer, religious, political) to family/world",
  },
  {
    slug: 'impostor-syndrome',
    facet: 'A',
    label: 'impostor syndrome',
    hint: 'feeling unworthy of a position one has earned',
  },
  {
    slug: 'alter-ego',
    facet: 'A',
    label: 'alter ego',
    hint: 'a secondary identity (mask, persona, double life)',
  },
  {
    slug: 'gender-and-roles',
    facet: 'A',
    label: 'gender and roles',
    hint: 'expectations and constraints based on gender',
  },
  {
    slug: 'mental-illness-portrayal',
    facet: 'A',
    label: 'mental illness portrayal',
    hint: 'depression, anxiety, psychosis, treatment, stigma',
  },
  {
    slug: 'addiction-and-recovery',
    facet: 'A',
    label: 'addiction and recovery',
    hint: 'substance or behavioural dependence and the path back',
  },
  {
    slug: 'trauma-survival',
    facet: 'A',
    label: 'trauma survival',
    hint: 'living with the after-effects of catastrophic events',
  },
  {
    slug: 'finding-purpose',
    facet: 'A',
    label: 'finding purpose',
    hint: 'a protagonist searching for meaning',
  },

  // Genre / structure (topical)
  {
    slug: 'mystery-investigation',
    facet: 'A',
    label: 'mystery and investigation',
    hint: 'solving a puzzle, detective work; structural mystery',
  },
  {
    slug: 'whodunit',
    facet: 'A',
    label: 'whodunit',
    hint: 'classic crime puzzle with a defined suspect list',
  },
  {
    slug: 'heist-and-caper',
    facet: 'A',
    label: 'heist and caper',
    hint: 'planned theft, con jobs, elaborate schemes',
  },
  {
    slug: 'survival-and-endurance',
    facet: 'A',
    label: 'survival and endurance',
    hint: 'staying alive against hostile conditions',
  },
  {
    slug: 'chase-and-escape',
    facet: 'A',
    label: 'chase and escape',
    hint: 'pursuit as central engine; flight from threat',
  },
  {
    slug: 'single-incident-fallout',
    facet: 'A',
    label: 'single-incident fallout',
    hint: 'one event whose consequences ripple through the story',
  },
  {
    slug: 'ensemble-mosaic',
    facet: 'A',
    label: 'ensemble mosaic',
    hint: 'multiple parallel storylines weaving together',
  },
  {
    slug: 'workplace-procedural',
    facet: 'A',
    label: 'workplace procedural',
    hint: 'a profession explored through case-of-the-week structure',
  },
  {
    slug: 'fish-out-of-water',
    facet: 'A',
    label: 'fish out of water',
    hint: 'protagonist transplanted into an unfamiliar world',
  },
  {
    slug: 'mentor-and-pupil',
    facet: 'A',
    label: 'mentor and pupil',
    hint: 'teaching relationship at the heart of the story',
  },
  {
    slug: 'underdog-rise',
    facet: 'A',
    label: 'underdog rise',
    hint: 'unlikely figure overcoming odds',
  },
  {
    slug: 'rise-and-fall',
    facet: 'A',
    label: 'rise and fall',
    hint: 'arc of ascent followed by collapse',
  },

  // War & violence
  {
    slug: 'war-and-its-toll',
    facet: 'A',
    label: 'war and its toll',
    hint: 'the human cost of armed conflict',
  },
  {
    slug: 'soldier-coming-home',
    facet: 'A',
    label: 'soldier coming home',
    hint: "reintegration after combat; veterans' lives",
  },
  {
    slug: 'civilian-under-occupation',
    facet: 'A',
    label: 'civilian under occupation',
    hint: 'ordinary life under foreign or hostile rule',
  },
  {
    slug: 'generational-trauma',
    facet: 'A',
    label: 'generational trauma',
    hint: 'pain inherited from previous generations',
  },

  // Speculative
  {
    slug: 'post-apocalyptic-survival',
    facet: 'A',
    label: 'post-apocalyptic survival',
    hint: 'life after collapse of civilisation',
  },
  {
    slug: 'dystopian-society',
    facet: 'A',
    label: 'dystopian society',
    hint: 'oppressive future or alternate present',
  },
  {
    slug: 'time-loop',
    facet: 'A',
    label: 'time loop',
    hint: 'characters repeating the same period',
  },
  {
    slug: 'alternate-history',
    facet: 'A',
    label: 'alternate history',
    hint: 'history rewritten at a key turning point',
  },
  {
    slug: 'first-contact',
    facet: 'A',
    label: 'first contact',
    hint: "humanity's first encounter with the alien/other",
  },
  {
    slug: 'technology-runs-amok',
    facet: 'A',
    label: 'technology runs amok',
    hint: 'AI/biotech/cyber gone wrong',
  },
  {
    slug: 'magic-system-cost',
    facet: 'A',
    label: 'magic system with a cost',
    hint: 'power that demands something from its user',
  },
  {
    slug: 'existential-horror',
    facet: 'A',
    label: 'existential horror',
    hint: 'dread rooted in meaninglessness or the unknown — may be ideas-driven or visceral in execution',
  },
  {
    slug: 'folk-horror',
    facet: 'A',
    label: 'folk horror',
    hint: 'rural, ritual, deep-time horror',
  },
  {
    slug: 'cosmic-horror',
    facet: 'A',
    label: 'cosmic horror',
    hint: 'horror from incomprehensibly vast forces (Lovecraftian)',
  },

  // Anime / East-Asian specific
  {
    slug: 'isekai',
    facet: 'A',
    label: 'isekai',
    hint: 'protagonist transported or reincarnated into another world; fantasy-world mechanics are central',
  },
  {
    slug: 'slice-of-life',
    facet: 'A',
    label: 'slice of life',
    hint: 'low-conflict, quotidian, character-and-atmosphere driven; no strong central plot engine',
  },

  // -------------------------------------------------------------------------
  // Facet B — Structural Arc (how the story is shaped)
  // -------------------------------------------------------------------------
  {
    slug: 'slow-burn',
    facet: 'B',
    label: 'slow burn',
    hint: 'deliberate pacing; tension or relationship accumulates gradually over many episodes',
  },
  {
    slug: 'nonlinear-storytelling',
    facet: 'B',
    label: 'nonlinear storytelling',
    hint: 'fractured chronology as structural choice, or deliberately withheld cause-and-effect',
  },
  {
    slug: 'arc-ends-uplifting',
    facet: 'B',
    label: 'uplifting ending',
    hint: 'emotional direction of the ending is positive — catharsis, resolution, or hope; distinct from underdog-rise (topical)',
  },
  {
    slug: 'arc-ends-downbeat',
    facet: 'B',
    label: 'downbeat ending',
    hint: 'ending is tragic, bleak, or unresolved in a negative direction; complements arc-ends-uplifting',
  },
  {
    slug: 'protagonist-transforms',
    facet: 'B',
    label: 'protagonist transforms',
    hint: 'the central character materially changes by the end; distinct from coming-of-age (which is specifically the youth-to-adult transition)',
  },

  // -------------------------------------------------------------------------
  // Facet C — Affective Texture (how it feels to watch)
  // -------------------------------------------------------------------------
  {
    slug: 'tone-brooding',
    facet: 'C',
    label: 'brooding',
    hint: 'heavy, oppressive, or melancholic atmosphere; the dread or sadness is in the tone itself, not just the events',
  },
  {
    slug: 'tone-bittersweet',
    facet: 'C',
    label: 'bittersweet',
    hint: 'joy and sorrow coexist; wistful, poignant, autumnal register; NOT the same as arc-ends-uplifting or arc-ends-downbeat',
  },
  {
    slug: 'tone-rousing',
    facet: 'C',
    label: 'rousing',
    hint: 'energetic, uplifting, propulsive register; about sustained energy level, not plot outcome — a rousing story can still end in tragedy',
  },
  {
    slug: 'tone-playful',
    facet: 'C',
    label: 'playful',
    hint: 'light, fun, comedic register without being absurdist or dark; covers feel-good comedies, cosy shows, upbeat slice-of-life',
  },
  {
    slug: 'magical-realism',
    facet: 'C',
    label: 'magical realism',
    hint: 'matter-of-fact treatment of impossible elements; the impossible is unremarkable',
  },
  {
    slug: 'absurdist-comedy',
    facet: 'C',
    label: 'absurdist comedy',
    hint: 'logic-breaking, surreal humour',
  },
  {
    slug: 'dark-comedy',
    facet: 'C',
    label: 'dark comedy',
    hint: 'humour rooted in bleak subject matter',
  },
  {
    slug: 'satire-of-power',
    facet: 'C',
    label: 'satire of power',
    hint: 'comic skewering of politicians, executives, institutions',
  },
  {
    slug: 'biographical-portrait',
    facet: 'C',
    label: 'biographical portrait',
    hint: 'the life story of a specific named real person or historical figure',
  },
  {
    slug: 'character-study',
    facet: 'C',
    label: 'character study',
    hint: 'dense interior focus on a single protagonist; NOT a biographical work about a real person',
  },
  {
    slug: 'meditation-on-time',
    facet: 'C',
    label: 'meditation on time',
    hint: 'time itself as a theme — memory, ageing, change',
  },
  {
    slug: 'meditation-on-death',
    facet: 'C',
    label: 'meditation on death',
    hint: 'mortality as a central preoccupation',
  },
];

export const THEME_SLUGS: ReadonlySet<string> = new Set(THEME_VOCABULARY.map((t) => t.slug));

export function labelForSlug(slug: string): string | null {
  const entry = THEME_VOCABULARY.find((t) => t.slug === slug);
  return entry?.label ?? null;
}
