// Cross-medium theme mappings — the editorial substrate that bridges
// TMDB's lowercase user-submitted-ish keywords with AniList's curated
// Title-Case taxonomy. This file is the SOURCE OF TRUTH; the database
// representation in apps/web/src/server/schema/themes.ts is what the
// rec engine reads at scoring time.
//
// Per packages/ml/CLAUDE.md: this file is a pure TS data export. No file
// I/O. The Inngest function in apps/web (apply-themes) imports this
// constant, looks up tag IDs by (source, name), and upserts rows.
//
// Adding a mapping:
//   1. Pick a stable kebab-case slug (slugs shouldn't change; names can).
//   2. List members by exact (source, tagName) — case matters because
//      tags.name UNIQUE is case-sensitive (TMDB: "tragedy", AniList:
//      "Tragedy" are two separate rows that the theme bridges).
//   3. Strength 100 = full match, 70-90 = narrower/broader sibling, <70
//      = loose association. v1 is mostly 100s; partial mappings get
//      useful as the editorial surface matures.
//
// Removing a mapping from this file does NOT delete the DB row — orphans
// are harmless (the tag still scores via direct tag-overlap; the theme
// just has one fewer member).
//
// Coverage note (2026-05-08): only ~50 anime synced so far, so AniList
// genres like "Romance", "Comedy", "Drama", "Mystery", "Horror",
// "Psychological" aren't yet in the tags table — the seed set below
// uses only verified-existing tag names. Once the AniList sync covers
// more pages, broader theme mappings open up.

export interface ThemeMember {
  readonly source: 'tmdb' | 'anilist';
  readonly tagName: string;
  readonly strength: number;
}

export interface ThemeMapping {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly members: readonly ThemeMember[];
}

export const THEME_MAPPINGS: readonly ThemeMapping[] = [
  {
    slug: 'tragedy',
    name: 'Tragedy',
    description: 'Stories whose central arc is loss, downfall, or unrecoverable consequence.',
    members: [
      { source: 'tmdb', tagName: 'tragedy', strength: 100 },
      { source: 'anilist', tagName: 'Tragedy', strength: 100 },
    ],
  },
  {
    slug: 'super-power',
    name: 'Super Power',
    description:
      'Protagonists with abilities outside the human baseline — psychic, magical, biotech, mythic.',
    members: [
      { source: 'tmdb', tagName: 'super power', strength: 100 },
      { source: 'anilist', tagName: 'Super Power', strength: 100 },
    ],
  },
  {
    slug: 'antihero',
    name: 'Antihero',
    description:
      'Protagonists with morally ambiguous or outright villainous traits as central appeal.',
    members: [
      { source: 'tmdb', tagName: 'antihero', strength: 100 },
      { source: 'anilist', tagName: 'Anti-Hero', strength: 100 },
    ],
  },
  {
    slug: 'post-apocalyptic',
    name: 'Post-Apocalyptic',
    description: 'Setting after societal collapse — wasteland, scarcity, factional remnants.',
    members: [
      { source: 'tmdb', tagName: 'post-apocalyptic', strength: 100 },
      { source: 'anilist', tagName: 'Post-Apocalyptic', strength: 100 },
    ],
  },
  {
    slug: 'revenge',
    name: 'Revenge',
    description: 'Protagonist driven by retaliation against a wrong done to them or theirs.',
    members: [
      { source: 'tmdb', tagName: 'revenge', strength: 100 },
      { source: 'anilist', tagName: 'Revenge', strength: 100 },
    ],
  },
  {
    slug: 'demons',
    name: 'Demons',
    description: 'Demonic entities as antagonists, allies, or protagonists.',
    members: [
      { source: 'tmdb', tagName: 'demon', strength: 100 },
      { source: 'anilist', tagName: 'Demons', strength: 100 },
    ],
  },
  {
    slug: 'vampires',
    name: 'Vampires',
    description: 'Vampire fiction — gothic, modern, or comedic.',
    members: [
      { source: 'tmdb', tagName: 'vampire', strength: 100 },
      { source: 'anilist', tagName: 'Vampire', strength: 100 },
    ],
  },
  {
    slug: 'zombies',
    name: 'Zombies',
    description: 'Undead-outbreak fiction — survival, horror, or satire.',
    members: [
      { source: 'tmdb', tagName: 'zombie', strength: 100 },
      { source: 'anilist', tagName: 'Zombie', strength: 100 },
    ],
  },
  {
    slug: 'war',
    name: 'War',
    description: 'Armed conflict between nations or factions as primary backdrop or subject.',
    members: [
      { source: 'tmdb', tagName: 'war', strength: 100 },
      { source: 'anilist', tagName: 'War', strength: 100 },
    ],
  },
  {
    slug: 'crime',
    name: 'Crime',
    description: 'Criminal activity — heists, syndicates, investigations — as central material.',
    members: [
      { source: 'tmdb', tagName: 'crime', strength: 100 },
      { source: 'anilist', tagName: 'Crime', strength: 100 },
    ],
  },
  {
    slug: 'martial-arts',
    name: 'Martial Arts',
    description: 'Hand-to-hand combat traditions as choreographic and narrative core.',
    members: [
      { source: 'tmdb', tagName: 'martial arts', strength: 100 },
      { source: 'anilist', tagName: 'Martial Arts', strength: 100 },
    ],
  },
  {
    slug: 'magic',
    name: 'Magic',
    description: 'Spellcasting, sorcery, and supernatural manipulation as a defined system.',
    members: [
      { source: 'tmdb', tagName: 'magic', strength: 100 },
      { source: 'anilist', tagName: 'Magic', strength: 100 },
      { source: 'tmdb', tagName: 'witch', strength: 70 },
    ],
  },
  {
    slug: 'detectives',
    name: 'Detectives',
    description:
      'Investigation-driven storytelling — police procedurals, private eyes, amateur sleuths.',
    members: [
      { source: 'tmdb', tagName: 'detective', strength: 100 },
      { source: 'anilist', tagName: 'Detective', strength: 100 },
    ],
  },
  {
    slug: 'survival',
    name: 'Survival',
    description: 'Endurance against hostile environment, wilderness, or extreme circumstance.',
    members: [
      { source: 'tmdb', tagName: 'survival', strength: 100 },
      { source: 'anilist', tagName: 'Survival', strength: 100 },
    ],
  },
  {
    slug: 'samurai',
    name: 'Samurai',
    description: 'Feudal Japanese warrior class — codes of honour, swordplay, period drama.',
    members: [
      { source: 'tmdb', tagName: 'samurai', strength: 100 },
      { source: 'anilist', tagName: 'Samurai', strength: 100 },
    ],
  },
  {
    slug: 'amnesia',
    name: 'Amnesia',
    description: 'Memory loss as plot engine — recovered identity, manipulation, mystery.',
    members: [
      { source: 'tmdb', tagName: 'amnesia', strength: 100 },
      { source: 'anilist', tagName: 'Amnesia', strength: 100 },
      { source: 'tmdb', tagName: 'memory loss', strength: 90 },
    ],
  },
  {
    slug: 'assassins',
    name: 'Assassins',
    description: 'Contract killers — guild structures, missions, moral fallout.',
    members: [
      { source: 'tmdb', tagName: 'assassin', strength: 100 },
      { source: 'anilist', tagName: 'Assassins', strength: 100 },
    ],
  },
  {
    slug: 'mafia',
    name: 'Mafia',
    description: 'Organised crime families — loyalty, succession, business of vice.',
    members: [
      { source: 'tmdb', tagName: 'mafia', strength: 100 },
      { source: 'anilist', tagName: 'Mafia', strength: 100 },
    ],
  },
  {
    slug: 'ninja',
    name: 'Ninja',
    description: 'Shinobi tradition — espionage, stealth combat, clan politics.',
    members: [
      { source: 'tmdb', tagName: 'ninja', strength: 100 },
      { source: 'anilist', tagName: 'Ninja', strength: 100 },
    ],
  },
  {
    slug: 'dragons',
    name: 'Dragons',
    description: 'Dragons as deity, enemy, mount, or ally.',
    members: [
      { source: 'tmdb', tagName: 'dragon', strength: 100 },
      { source: 'anilist', tagName: 'Dragons', strength: 100 },
    ],
  },
  {
    slug: 'ghosts',
    name: 'Ghosts',
    description: 'Hauntings, lingering spirits, communication with the dead.',
    members: [
      { source: 'tmdb', tagName: 'ghost', strength: 100 },
      { source: 'anilist', tagName: 'Ghost', strength: 100 },
    ],
  },
  {
    slug: 'dystopian',
    name: 'Dystopian',
    description: 'Oppressive future or alternate societies — surveillance, control, resistance.',
    members: [
      { source: 'tmdb', tagName: 'dystopia', strength: 100 },
      { source: 'anilist', tagName: 'Dystopian', strength: 100 },
    ],
  },
  {
    slug: 'aliens',
    name: 'Aliens',
    description: 'Extraterrestrial species — invasion, contact, coexistence.',
    members: [
      { source: 'tmdb', tagName: 'alien', strength: 100 },
      { source: 'tmdb', tagName: 'aliens', strength: 100 },
      { source: 'anilist', tagName: 'Aliens', strength: 100 },
    ],
  },
  {
    slug: 'mythology',
    name: 'Mythology',
    description: 'Drawing on classical or world myth as narrative scaffold or worldbuilding.',
    members: [
      { source: 'tmdb', tagName: 'mythology', strength: 100 },
      { source: 'anilist', tagName: 'Mythology', strength: 100 },
    ],
  },
  {
    slug: 'military',
    name: 'Military',
    description: 'Armed-forces life — units, hierarchy, deployment — outside of war-as-backdrop.',
    members: [
      { source: 'tmdb', tagName: 'military', strength: 100 },
      { source: 'anilist', tagName: 'Military', strength: 100 },
    ],
  },
  {
    slug: 'medieval',
    name: 'Medieval',
    description: 'Pre-industrial setting — castles, knights, feudalism, sword-and-sorcery.',
    members: [
      { source: 'tmdb', tagName: 'medieval', strength: 100 },
      { source: 'anilist', tagName: 'Medieval', strength: 100 },
    ],
  },
  {
    slug: 'historical',
    name: 'Historical',
    description: 'Period drama anchored in a documented historical era.',
    members: [
      { source: 'tmdb', tagName: 'historical', strength: 100 },
      { source: 'anilist', tagName: 'Historical', strength: 100 },
    ],
  },
  {
    slug: 'school-life',
    name: 'School Life',
    description: 'Academic settings as primary social arena — adolescence, classmates, faculty.',
    members: [
      { source: 'tmdb', tagName: 'school', strength: 100 },
      { source: 'anilist', tagName: 'School', strength: 100 },
      { source: 'tmdb', tagName: 'high school', strength: 80 },
    ],
  },
  {
    slug: 'time-manipulation',
    name: 'Time Manipulation',
    description: 'Time travel, loops, rewind, paradox — temporal mechanics as core conceit.',
    members: [
      { source: 'tmdb', tagName: 'time travel', strength: 100 },
      { source: 'anilist', tagName: 'Time Manipulation', strength: 100 },
    ],
  },
  {
    slug: 'space',
    name: 'Space',
    description:
      'Off-world or interstellar setting — exploration, station life, opera-scale conflict.',
    members: [
      { source: 'tmdb', tagName: 'space opera', strength: 100 },
      { source: 'anilist', tagName: 'Space', strength: 100 },
    ],
  },
  {
    slug: 'reincarnation',
    name: 'Reincarnation',
    description: 'Reborn into a new body, world, or timeline — identity continuity across lives.',
    members: [
      { source: 'tmdb', tagName: 'reincarnation', strength: 100 },
      { source: 'anilist', tagName: 'Reincarnation', strength: 100 },
    ],
  },
  {
    slug: 'isekai',
    name: 'Isekai',
    description:
      'Transported-to-another-world fiction — portal fantasy, parallel-realm displacement.',
    members: [
      { source: 'tmdb', tagName: 'isekai', strength: 100 },
      { source: 'anilist', tagName: 'Isekai', strength: 100 },
      { source: 'tmdb', tagName: 'parallel world', strength: 80 },
    ],
  },
  {
    slug: 'espionage',
    name: 'Espionage',
    description: 'Spies, agents, intelligence work — covert ops as central activity.',
    members: [
      { source: 'tmdb', tagName: 'spy', strength: 100 },
      { source: 'tmdb', tagName: 'espionage', strength: 100 },
      { source: 'anilist', tagName: 'Espionage', strength: 100 },
    ],
  },
  {
    slug: 'pirates',
    name: 'Pirates',
    description: 'Maritime outlaws — sailing, treasure, naval combat.',
    members: [
      { source: 'tmdb', tagName: 'pirate', strength: 100 },
      { source: 'anilist', tagName: 'Pirates', strength: 100 },
    ],
  },
  {
    slug: 'cult',
    name: 'Cult',
    description: 'Closed religious or ideological groups — coercion, indoctrination, escape.',
    members: [
      { source: 'tmdb', tagName: 'cult', strength: 100 },
      { source: 'anilist', tagName: 'Cult', strength: 100 },
    ],
  },
  {
    slug: 'gambling',
    name: 'Gambling',
    description: 'High-stakes wagering — casinos, card games, life-or-death chance.',
    members: [
      { source: 'tmdb', tagName: 'gambling', strength: 100 },
      { source: 'anilist', tagName: 'Gambling', strength: 100 },
    ],
  },
  {
    slug: 'gangs',
    name: 'Gangs',
    description: 'Street-level criminal collectives — turf, hierarchy, loyalty pressure.',
    members: [
      { source: 'tmdb', tagName: 'gang', strength: 100 },
      { source: 'anilist', tagName: 'Gangs', strength: 100 },
    ],
  },
  {
    slug: 'prison',
    name: 'Prison',
    description: 'Incarceration as setting — confinement, escape, internal politics.',
    members: [
      { source: 'tmdb', tagName: 'prison', strength: 100 },
      { source: 'anilist', tagName: 'Prison', strength: 100 },
    ],
  },
  {
    slug: 'religion',
    name: 'Religion',
    description: 'Faith, ritual, and ecclesiastical structures as substantive subject matter.',
    members: [
      { source: 'tmdb', tagName: 'religion', strength: 100 },
      { source: 'anilist', tagName: 'Religion', strength: 100 },
    ],
  },
  {
    slug: 'pandemic',
    name: 'Pandemic',
    description: 'Disease outbreak at societal scale — medical, social, breakdown narrative.',
    members: [
      { source: 'tmdb', tagName: 'pandemic', strength: 100 },
      { source: 'anilist', tagName: 'Pandemic', strength: 100 },
    ],
  },
];
