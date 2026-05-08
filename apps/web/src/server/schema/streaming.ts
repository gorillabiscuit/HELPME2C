import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { titles } from './titles';
import { users } from './users';

export const streamingTypeEnum = pgEnum('streaming_type', ['streaming', 'rent', 'buy', 'free']);

export const streamingAvailability = pgTable(
  'streaming_availability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    titleId: uuid('title_id')
      .notNull()
      .references(() => titles.id, { onDelete: 'cascade' }),
    // TMDB watch provider ID (integer stored as text for cross-source flexibility).
    providerId: text('provider_id').notNull(),
    providerName: text('provider_name').notNull(),
    providerLogoUrl: text('provider_logo_url'),
    // ISO 3166-1 alpha-2 country code (e.g. "ZA", "NL", "GB").
    countryCode: text('country_code').notNull(),
    type: streamingTypeEnum('type').notNull(),
    // Source URL. Affiliate params are added at render time per PROJECT.md §revenue —
    // never stored here so we can change the affiliate scheme without a migration.
    sourceUrl: text('source_url'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('streaming_title_country_idx').on(t.titleId, t.countryCode),
    index('streaming_provider_idx').on(t.providerId),
    // Upsert target for the per-title sync — one row per
    // (title × provider × country × type). TMDB sometimes lists the
    // same provider under multiple types (e.g. Apple TV streams *and*
    // rents in the same region) so all four columns are required to
    // disambiguate. Per LEARNED.md 2026-05-06: use uniqueIndex, not
    // index() with a "should be unique" comment, or ON CONFLICT lies.
    uniqueIndex('streaming_title_provider_country_type_unique').on(
      t.titleId,
      t.providerId,
      t.countryCode,
      t.type,
    ),
  ],
);

// User's "I subscribe to these" set, used by the dashboard's post-ranking
// filter per ADR-0021 ("filter, never a ranking input"). Stored as a join
// table rather than an array column so on-delete cascades clean up cleanly
// per ADR-0012 §account-deletion.
//
// We store provider_id only — name and logo are looked up at render time
// from streaming_availability rows, so the canonical source of provider
// metadata stays the TMDB sync, not this table.
export const userStreamingProviders = pgTable(
  'user_streaming_providers',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: text('provider_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.providerId] })],
);
