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
// Structure: slug | label | hint (the hint isn't sent to users — only
// to the LLM, to disambiguate close-meaning slugs).

export interface ThemeVocabEntry {
  readonly slug: string;
  readonly label: string;
  readonly hint: string;
}

export const THEME_VOCABULARY: ReadonlyArray<ThemeVocabEntry> = [
  // Relationship & emotion
  {
    slug: 'found-family',
    label: 'found family',
    hint: 'unrelated people becoming a chosen family',
  },
  {
    slug: 'grief-and-loss',
    label: 'grief and loss',
    hint: 'mourning, processing death of a loved one',
  },
  {
    slug: 'forbidden-love',
    label: 'forbidden love',
    hint: 'romantic connection across social/legal/family barriers',
  },
  {
    slug: 'coming-of-age',
    label: 'coming of age',
    hint: 'transition from youth to adulthood; identity formation',
  },
  {
    slug: 'friendship-tested',
    label: 'friendship tested',
    hint: 'long-standing bonds strained by conflict, betrayal, or loss',
  },
  {
    slug: 'parent-child-rift',
    label: 'parent-child rift',
    hint: 'generational conflict, estrangement, attempts at reconciliation',
  },
  {
    slug: 'redemption-arc',
    label: 'redemption arc',
    hint: 'a deeply flawed character earning their way back',
  },
  {
    slug: 'unrequited-longing',
    label: 'unrequited longing',
    hint: 'one-sided love that shapes the protagonist',
  },
  {
    slug: 'toxic-relationship',
    label: 'toxic relationship',
    hint: 'love that damages, codependency, abuse',
  },
  {
    slug: 'loneliness-and-isolation',
    label: 'loneliness and isolation',
    hint: 'characters cut off from human connection',
  },
  {
    slug: 'platonic-soulmates',
    label: 'platonic soulmates',
    hint: 'non-romantic deep bonds that drive the story',
  },

  // Power & society
  {
    slug: 'power-corrupts',
    label: 'power corrupts',
    hint: 'moral decay that comes from holding power',
  },
  {
    slug: 'class-conflict',
    label: 'class conflict',
    hint: 'inequality and friction between economic classes',
  },
  {
    slug: 'institutional-failure',
    label: 'institutional failure',
    hint: 'when systems (police, courts, hospitals) fail the people they serve',
  },
  {
    slug: 'revolution-and-rebellion',
    label: 'revolution and rebellion',
    hint: 'organised resistance against an established order',
  },
  {
    slug: 'corruption-and-cover-up',
    label: 'corruption and cover-up',
    hint: 'exposing wrongdoing inside an institution',
  },
  {
    slug: 'propaganda-and-truth',
    label: 'propaganda and truth',
    hint: 'manipulation of information, journalism, manufactured consent',
  },
  {
    slug: 'legacy-of-empire',
    label: 'legacy of empire',
    hint: 'colonialism and post-colonial reckoning',
  },
  {
    slug: 'celebrity-and-fame',
    label: 'celebrity and fame',
    hint: 'the cost of public visibility, image management, parasocial dynamics',
  },

  // Moral
  {
    slug: 'moral-compromise',
    label: 'moral compromise',
    hint: 'protagonists making choices that erode their own values',
  },
  {
    slug: 'vigilante-justice',
    label: 'vigilante justice',
    hint: "taking the law into one's own hands",
  },
  {
    slug: 'ethical-dilemma',
    label: 'ethical dilemma',
    hint: 'unsolvable choices with no clean answer',
  },
  {
    slug: 'guilt-and-atonement',
    label: 'guilt and atonement',
    hint: 'living with what one has done',
  },
  {
    slug: 'impossible-choice',
    label: 'impossible choice',
    hint: 'lose-lose scenarios that drive the plot',
  },
  {
    slug: 'betrayal-and-forgiveness',
    label: 'betrayal and forgiveness',
    hint: 'central betrayal and the question of whether to forgive',
  },
  {
    slug: 'vengeance-and-its-cost',
    label: 'vengeance and its cost',
    hint: 'revenge as the engine, and what it takes from the avenger',
  },
  {
    slug: 'complicity-with-evil',
    label: 'complicity with evil',
    hint: 'ordinary people participating in atrocity',
  },

  // Identity & self
  { slug: 'identity-crisis', label: 'identity crisis', hint: 'who am I, fundamentally?' },
  {
    slug: 'coming-out',
    label: 'coming out',
    hint: "revealing one's identity (queer, religious, political) to family/world",
  },
  {
    slug: 'impostor-syndrome',
    label: 'impostor syndrome',
    hint: 'feeling unworthy of a position one has earned',
  },
  {
    slug: 'alter-ego',
    label: 'alter ego',
    hint: 'a secondary identity (mask, persona, double life)',
  },
  {
    slug: 'gender-and-roles',
    label: 'gender and roles',
    hint: 'expectations and constraints based on gender',
  },
  {
    slug: 'mental-illness-portrayal',
    label: 'mental illness portrayal',
    hint: 'depression, anxiety, psychosis, treatment, stigma',
  },
  {
    slug: 'addiction-and-recovery',
    label: 'addiction and recovery',
    hint: 'substance or behavioural dependence and the path back',
  },
  {
    slug: 'trauma-survival',
    label: 'trauma survival',
    hint: 'living with the after-effects of catastrophic events',
  },
  {
    slug: 'finding-purpose',
    label: 'finding purpose',
    hint: 'a protagonist searching for meaning',
  },

  // Genre / structure
  {
    slug: 'mystery-investigation',
    label: 'mystery and investigation',
    hint: 'solving a puzzle, detective work; structural mystery',
  },
  { slug: 'whodunit', label: 'whodunit', hint: 'classic crime puzzle with a defined suspect list' },
  {
    slug: 'heist-and-caper',
    label: 'heist and caper',
    hint: 'planned theft, con jobs, elaborate schemes',
  },
  {
    slug: 'survival-and-endurance',
    label: 'survival and endurance',
    hint: 'staying alive against hostile conditions',
  },
  {
    slug: 'chase-and-escape',
    label: 'chase and escape',
    hint: 'pursuit as central engine; flight from threat',
  },
  {
    slug: 'single-incident-fallout',
    label: 'single-incident fallout',
    hint: 'one event whose consequences ripple through the story',
  },
  {
    slug: 'ensemble-mosaic',
    label: 'ensemble mosaic',
    hint: 'multiple parallel storylines weaving together',
  },
  {
    slug: 'workplace-procedural',
    label: 'workplace procedural',
    hint: 'a profession explored through case-of-the-week structure',
  },
  {
    slug: 'fish-out-of-water',
    label: 'fish out of water',
    hint: 'protagonist transplanted into an unfamiliar world',
  },
  {
    slug: 'mentor-and-pupil',
    label: 'mentor and pupil',
    hint: 'teaching relationship at the heart of the story',
  },
  { slug: 'underdog-rise', label: 'underdog rise', hint: 'unlikely figure overcoming odds' },
  { slug: 'rise-and-fall', label: 'rise and fall', hint: 'arc of ascent followed by collapse' },

  // War & violence
  { slug: 'war-and-its-toll', label: 'war and its toll', hint: 'the human cost of armed conflict' },
  {
    slug: 'soldier-coming-home',
    label: 'soldier coming home',
    hint: "reintegration after combat; veterans' lives",
  },
  {
    slug: 'civilian-under-occupation',
    label: 'civilian under occupation',
    hint: 'ordinary life under foreign or hostile rule',
  },
  {
    slug: 'generational-trauma',
    label: 'generational trauma',
    hint: 'pain inherited from previous generations',
  },

  // Speculative
  {
    slug: 'post-apocalyptic-survival',
    label: 'post-apocalyptic survival',
    hint: 'life after collapse of civilisation',
  },
  {
    slug: 'dystopian-society',
    label: 'dystopian society',
    hint: 'oppressive future or alternate present',
  },
  { slug: 'time-loop', label: 'time loop', hint: 'characters repeating the same period' },
  {
    slug: 'alternate-history',
    label: 'alternate history',
    hint: 'history rewritten at a key turning point',
  },
  {
    slug: 'first-contact',
    label: 'first contact',
    hint: "humanity's first encounter with the alien/other",
  },
  {
    slug: 'technology-runs-amok',
    label: 'technology runs amok',
    hint: 'AI/biotech/cyber gone wrong',
  },
  {
    slug: 'magic-system-cost',
    label: 'magic system with a cost',
    hint: 'power that demands something from its user',
  },
  {
    slug: 'existential-horror',
    label: 'existential horror',
    hint: 'dread rooted in meaninglessness or the unknown',
  },
  { slug: 'folk-horror', label: 'folk horror', hint: 'rural, ritual, deep-time horror' },
  {
    slug: 'cosmic-horror',
    label: 'cosmic horror',
    hint: 'horror from incomprehensibly vast forces (Lovecraftian)',
  },

  // Texture
  { slug: 'slow-burn', label: 'slow burn', hint: 'deliberate pacing, accumulating tension' },
  {
    slug: 'nonlinear-storytelling',
    label: 'nonlinear storytelling',
    hint: 'fractured chronology as structural choice',
  },
  {
    slug: 'magical-realism',
    label: 'magical realism',
    hint: 'matter-of-fact treatment of impossible elements',
  },
  { slug: 'absurdist-comedy', label: 'absurdist comedy', hint: 'logic-breaking, surreal humour' },
  { slug: 'dark-comedy', label: 'dark comedy', hint: 'humour rooted in bleak subject matter' },
  {
    slug: 'satire-of-power',
    label: 'satire of power',
    hint: 'comic skewering of politicians, executives, institutions',
  },
  {
    slug: 'biographical-portrait',
    label: 'biographical portrait',
    hint: "a specific real or fictional person's life story",
  },
  {
    slug: 'character-study',
    label: 'character study',
    hint: 'dense interior focus on a single protagonist',
  },
  {
    slug: 'meditation-on-time',
    label: 'meditation on time',
    hint: 'time itself as a theme — memory, ageing, change',
  },
  {
    slug: 'meditation-on-death',
    label: 'meditation on death',
    hint: 'mortality as a central preoccupation',
  },
];

export const THEME_SLUGS: ReadonlySet<string> = new Set(THEME_VOCABULARY.map((t) => t.slug));

export function labelForSlug(slug: string): string | null {
  const entry = THEME_VOCABULARY.find((t) => t.slug === slug);
  return entry?.label ?? null;
}
