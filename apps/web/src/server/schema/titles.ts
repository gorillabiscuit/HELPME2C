import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const mediaSourceEnum = pgEnum('media_source', ['tmdb', 'anilist']);
export const mediaTypeEnum = pgEnum('media_type', ['tv', 'film', 'anime']);
export const titleStatusEnum = pgEnum('title_status', [
  'ongoing',
  'completed',
  'cancelled',
  'upcoming',
]);

export const titles = pgTable(
  'titles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Source-specific ID (TMDB integer ID or AniList integer ID, stored as text).
    externalId: text('external_id').notNull(),
    source: mediaSourceEnum('source').notNull(),
    mediaType: mediaTypeEnum('media_type').notNull(),
    title: text('title').notNull(),
    originalTitle: text('original_title'),
    synopsis: text('synopsis'),
    status: titleStatusEnum('status'),
    releaseYear: integer('release_year'),
    endYear: integer('end_year'),
    // null for films; populated for series.
    episodeCount: integer('episode_count'),
    episodeDurationMinutes: integer('episode_duration_minutes'),
    posterUrl: text('poster_url'),
    backdropUrl: text('backdrop_url'),
    // Raw popularity score from the source API; used for cold-start ranking.
    popularityScore: real('popularity_score'),
    // MAL ID for AniList rows (AniList exposes idMal on every Media object).
    // Lets MAL imports (M8) match by MAL anime id without a separate
    // mapping table. Null on TMDB rows. Indexed for the lookup.
    idMal: integer('id_mal'),
    // Trailer for the preview-on-hover feature. Provider names the host
    // (currently 'youtube' for both TMDB + AniList trailers); video_id
    // is the embeddable identifier (YouTube watch ?v= value). Both null
    // when no trailer is known. Set at sync time; the UI checks for
    // both fields before rendering the preview overlay.
    trailerProvider: text('trailer_provider'),
    trailerVideoId: text('trailer_video_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Composite unique: (external_id, source, media_type). media_type is
    // required because TMDB uses separate ID namespaces for TV and movies —
    // TV ID 1421 and movie ID 1421 are different titles. Without media_type
    // in the constraint, a film upsert overwrites a TV entry with the same
    // numeric ID (discovered 2026-06-08: movie 1421 clobbered TV 1421 /
    // Modern Family). AniList is anime-only so media_type is always 'anime'
    // there — this constraint is still correct for that source.
    uniqueIndex('titles_external_id_source_media_type_idx').on(t.externalId, t.source, t.mediaType),
    index('titles_media_type_idx').on(t.mediaType),
    index('titles_release_year_idx').on(t.releaseYear),
    // MAL-id lookup index for the M8 import path. Partial-style coverage —
    // only AniList rows have idMal populated.
    index('titles_id_mal_idx').on(t.idMal),
  ],
);

// Normalised tag/keyword vocabulary — the cross-medium theme taxonomy (the moat).
// AniList tags are rich and well-curated; TMDB keywords are shallower.
// The unified table is the basis for tag-overlap scoring in packages/ml.
export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    source: mediaSourceEnum('source').notNull(),
    // AniList organises tags into categories (e.g. "Theme", "Setting", "Demographic").
    category: text('category'),
    description: text('description'),
  },
  (t) => [index('tags_name_idx').on(t.name), index('tags_source_idx').on(t.source)],
);

// Join table with per-edge metadata.
// weight: AniList-style 0–100 confidence; TMDB keywords default to 100.
// isSpoiler: AniList marks some tags as spoilers; hide from non-logged-in views.
export const titleTags = pgTable(
  'title_tags',
  {
    titleId: uuid('title_id')
      .notNull()
      .references(() => titles.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    weight: real('weight').notNull().default(100),
    isSpoiler: boolean('is_spoiler').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.titleId, t.tagId] })],
);
