import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { titles } from './titles';

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
  ],
);
