import { and, eq, desc, inArray, ne } from 'drizzle-orm';
import Link from 'next/link';
import { headers } from 'next/headers';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { findCrossMediumBridges, type TitleTagSet } from '@helpme2c/ml';
import { db } from '@/server/db';
import {
  streamingAvailability,
  tagThemes,
  tags,
  themes,
  titleTags,
  titles,
  users,
  watchEntries,
} from '@/server/schema';
import { dedupeByFranchise } from '@/server/lib/franchise';
import { groupTagsIntoTitleSets } from '@/inngest/lib/group-tags';
import { PreviewOverlay } from '@/components/preview-overlay';
import { RecCardActions } from '@/components/rec-card-actions';
import { TitleDetailAddButton } from '@/components/title-detail-add-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const idSchema = z.string().uuid();

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  upcoming: 'Upcoming',
};

const MEDIA_TYPE_LABEL: Record<string, string> = {
  tv: 'TV series',
  film: 'Film',
  anime: 'Anime',
};

// Order matters — drives display order on the title page.
const STREAMING_TYPE_LABEL: Record<'streaming' | 'rent' | 'buy' | 'free', string> = {
  streaming: 'Streaming',
  free: 'Free with ads',
  rent: 'Rent',
  buy: 'Buy',
};
const STREAMING_TYPE_ORDER: ReadonlyArray<'streaming' | 'rent' | 'buy' | 'free'> = [
  'streaming',
  'free',
  'rent',
  'buy',
];

function formatRelativeTime(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default async function TitleDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Reject anything that isn't a valid UUID immediately. Anything else
  // would just produce an empty SELECT — better to 404 fast.
  if (!idSchema.safeParse(id).success) {
    notFound();
  }

  // Phase 1A: registered users only per PROJECT.md scope. Sign-out users
  // get bounced to the marketing home rather than seeing a stub.
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect('/');
  }

  const [title] = await db.select().from(titles).where(eq(titles.id, id)).limit(1);
  if (!title) {
    notFound();
  }

  // Tags ordered by weight DESC (TMDB keywords are weight=100 today, but
  // AniList tags will vary 0-100 once that sync lands). Cap at 24 — beyond
  // that the pill row gets noisy.
  const tagRows = await db
    .select({
      id: tags.id,
      name: tags.name,
      category: tags.category,
      weight: titleTags.weight,
      isSpoiler: titleTags.isSpoiler,
    })
    .from(titleTags)
    .innerJoin(tags, eq(titleTags.tagId, tags.id))
    .where(eq(titleTags.titleId, id))
    .orderBy(desc(titleTags.weight))
    .limit(24);

  // Streaming providers per ADR-0021: surface as a post-ranking filter,
  // never as a ranking signal. UX prioritises the user's region, with a
  // count of "other regions" so they know data exists if they roam.
  const streamingRows = await db
    .select({
      providerId: streamingAvailability.providerId,
      providerName: streamingAvailability.providerName,
      providerLogoUrl: streamingAvailability.providerLogoUrl,
      countryCode: streamingAvailability.countryCode,
      type: streamingAvailability.type,
      sourceUrl: streamingAvailability.sourceUrl,
      updatedAt: streamingAvailability.updatedAt,
    })
    .from(streamingAvailability)
    .where(eq(streamingAvailability.titleId, id));

  // Region default: Vercel injects `x-vercel-ip-country` based on geolocation
  // — gives us a useful default without asking. Falls back to US when the
  // header is missing (local dev, non-Vercel deploys). Proper user-set
  // country comes with the M5.3 connected-providers settings page; until
  // then `users.region` is too coarse (eu / row) for TMDB's per-country
  // provider data.
  const requestHeaders = await headers();
  const primaryCountry = (requestHeaders.get('x-vercel-ip-country') ?? 'US').toUpperCase();

  const primaryRegionRows = streamingRows.filter((r) => r.countryCode === primaryCountry);
  const otherCountries = new Set(
    streamingRows.filter((r) => r.countryCode !== primaryCountry).map((r) => r.countryCode),
  );

  // Deduplicate providers within a (country, type) group — TMDB occasionally
  // returns the same provider twice for the same country/type combo across
  // sub-regions (rare but happens). Group key = type → sorted unique providers.
  const primaryByType = new Map<
    'streaming' | 'rent' | 'buy' | 'free',
    Array<{ providerId: string; providerName: string; providerLogoUrl: string | null }>
  >();
  for (const row of primaryRegionRows) {
    let bucket = primaryByType.get(row.type);
    if (!bucket) {
      bucket = [];
      primaryByType.set(row.type, bucket);
    }
    if (!bucket.some((p) => p.providerId === row.providerId)) {
      bucket.push({
        providerId: row.providerId,
        providerName: row.providerName,
        providerLogoUrl: row.providerLogoUrl,
      });
    }
  }

  const primarySourceUrl = primaryRegionRows.find((r) => r.sourceUrl)?.sourceUrl ?? null;
  const lastVerified =
    streamingRows.length === 0
      ? null
      : streamingRows.reduce(
          (max, r) => (r.updatedAt > max ? r.updatedAt : max),
          streamingRows[0]!.updatedAt,
        );

  // The current user's existing watch_entry for this title, if any.
  // Joined via users.clerk_id since watch_entries.user_id is the internal
  // uuid. Returns at most one row by the (user_id, title_id) UNIQUE index.
  // Pulls the full editable shape (rating, currentEpisode, notes) so the
  // LibraryEditDialog can prefill its form without a second round-trip.
  const [userEntryRow] = await db
    .select({
      kind: watchEntries.kind,
      status: watchEntries.status,
      rating: watchEntries.rating,
      currentEpisode: watchEntries.currentEpisode,
      notes: watchEntries.notes,
      privacy: watchEntries.privacy,
    })
    .from(watchEntries)
    .innerJoin(users, eq(watchEntries.userId, users.id))
    .where(and(eq(users.clerkId, clerkUserId), eq(watchEntries.titleId, id)))
    .limit(1);

  // Theme-similarity bridges. Per user feedback 2026-05-14, we DROPPED
  // the original "anime ↔ live-action only" framing — it set an
  // expectation the data couldn't fulfill (catalog has way more anime
  // than live-action, so anime-source pages returned all-anime cards
  // anyway). The thing that's actually valuable is "more shows with
  // the same themes" regardless of medium. Anime → anime is fine.
  // Live-action → anime still works (the moat the theme taxonomy was
  // designed for); it just isn't FORCED.
  //
  // The candidate pool excludes the source title itself. Each card
  // displays its own medium label so the user knows what they're
  // looking at.
  const [sourceTagRows, candidateTagRows, themeRows] = await Promise.all([
    db
      .select({
        titleId: titleTags.titleId,
        tagId: titleTags.tagId,
        weight: titleTags.weight,
      })
      .from(titleTags)
      .where(eq(titleTags.titleId, id)),
    db
      .select({
        titleId: titleTags.titleId,
        tagId: titleTags.tagId,
        weight: titleTags.weight,
      })
      .from(titleTags)
      .innerJoin(titles, eq(titleTags.titleId, titles.id))
      .where(ne(titles.id, id)),
    db
      .select({
        tagId: tagThemes.tagId,
        themeId: tagThemes.themeId,
        strength: tagThemes.strength,
      })
      .from(tagThemes),
  ]);

  const sourceTitleTagSet: TitleTagSet | null =
    sourceTagRows.length === 0
      ? null
      : { titleId: id, tags: sourceTagRows.map((r) => ({ tagId: r.tagId, weight: r.weight })) };

  // Overfetch 3× then collapse seasons of the same franchise. Without
  // this, "Attack on Titan", "AoT Season 2", "AoT Final Season" all
  // place separately and burn slots on the 6-card grid. Specific-season
  // bridges are still possible if the theme overlap is strong enough on
  // a specific season but not others — rare in practice.
  const BRIDGE_DISPLAY_LIMIT = 6;
  const rawBridges = sourceTitleTagSet
    ? findCrossMediumBridges(
        sourceTitleTagSet,
        groupTagsIntoTitleSets(candidateTagRows),
        themeRows,
        BRIDGE_DISPLAY_LIMIT * 3,
      )
    : [];

  // Fetch display metadata for the overfetched set so we have title
  // text for franchise dedup before slicing to the display limit.
  const rawBridgeTitleIds = rawBridges.map((b) => b.titleId);
  const rawBridgeTitleRows =
    rawBridgeTitleIds.length > 0
      ? await db
          .select({
            id: titles.id,
            title: titles.title,
            mediaType: titles.mediaType,
            releaseYear: titles.releaseYear,
            posterUrl: titles.posterUrl,
            trailerProvider: titles.trailerProvider,
            trailerVideoId: titles.trailerVideoId,
          })
          .from(titles)
          .where(inArray(titles.id, rawBridgeTitleIds))
      : [];
  const rawBridgeTitleById = new Map(rawBridgeTitleRows.map((t) => [t.id, t]));

  // Join bridge scores with title metadata, then dedup by franchise
  // and slice to the display limit. Theme info is attached separately
  // below (themeName lookup only needs the deduped survivors).
  const joinedBridges = rawBridges.flatMap((b) => {
    const meta = rawBridgeTitleById.get(b.titleId);
    if (!meta) return [];
    return [{ ...meta, bridgedThemes: b.bridgedThemes }];
  });
  const bridges = dedupeByFranchise(joinedBridges).slice(0, BRIDGE_DISPLAY_LIMIT);

  // Theme names for the "Shares the X theme" subtitle, one per card.
  const bridgeThemeIds = Array.from(
    new Set(bridges.flatMap((b) => b.bridgedThemes.slice(0, 1).map((t) => t.themeId))),
  );

  const bridgeThemeRows =
    bridgeThemeIds.length > 0
      ? await db
          .select({ id: themes.id, name: themes.name })
          .from(themes)
          .where(inArray(themes.id, bridgeThemeIds))
      : [];
  const bridgeThemeNameById = new Map(bridgeThemeRows.map((t) => [t.id, t.name]));

  const bridgeCards = bridges.map((b) => {
    const topTheme = b.bridgedThemes[0];
    const themeName = topTheme ? bridgeThemeNameById.get(topTheme.themeId) : null;
    return {
      id: b.id,
      title: b.title,
      mediaType: b.mediaType,
      posterUrl: b.posterUrl,
      trailerProvider: b.trailerProvider,
      trailerVideoId: b.trailerVideoId,
      themeName,
    };
  });

  const yearLabel =
    title.releaseYear && title.endYear
      ? `${title.releaseYear}–${title.endYear}`
      : (title.releaseYear?.toString() ?? '');
  const episodeLabel =
    title.episodeCount && title.mediaType !== 'film' ? `${title.episodeCount} episodes` : null;
  const statusLabel = title.status ? STATUS_LABEL[title.status] : null;
  const mediaTypeLabel = MEDIA_TYPE_LABEL[title.mediaType] ?? title.mediaType;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-[200px_1fr]">
        {title.posterUrl ? (
          <div className="group relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-muted">
            <Image
              src={title.posterUrl}
              alt={`${title.title} poster`}
              fill
              sizes="(min-width: 640px) 200px, 100vw"
              className="object-cover"
              priority
            />
            <PreviewOverlay
              trailerProvider={title.trailerProvider}
              trailerVideoId={title.trailerVideoId}
              titleText={title.title}
            />
          </div>
        ) : (
          <div className="aspect-[2/3] rounded-lg border border-border bg-muted" />
        )}

        <div>
          <h1 className="text-4xl font-semibold tracking-tight">{title.title}</h1>
          {title.originalTitle && title.originalTitle !== title.title ? (
            <p className="mt-1 text-sm text-muted-foreground">{title.originalTitle}</p>
          ) : null}

          <p className="mt-3 text-sm text-text-body">
            {[mediaTypeLabel, yearLabel, episodeLabel, statusLabel]
              .filter((s): s is string => Boolean(s))
              .join(' · ')}
          </p>

          {title.synopsis ? (
            <p className="mt-4 text-base leading-relaxed text-foreground">{title.synopsis}</p>
          ) : null}

          <div className="mt-6">
            <TitleDetailAddButton
              titleId={title.id}
              titleText={title.title}
              hasEpisodes={title.mediaType !== 'film'}
              initialEntry={
                userEntryRow
                  ? {
                      kind: userEntryRow.kind,
                      status: userEntryRow.status,
                      rating: userEntryRow.rating,
                      currentEpisode: userEntryRow.currentEpisode,
                      notes: userEntryRow.notes,
                      privacy: userEntryRow.privacy,
                    }
                  : null
              }
            />
          </div>
        </div>
      </div>

      {tagRows.length > 0 ? (
        <Card className="mt-10">
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tagRows.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {bridgeCards.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>More shows with the same themes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {bridgeCards.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/titles/${b.id}`}
                    className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                  >
                    {b.posterUrl ? (
                      <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-muted">
                        <Image
                          src={b.posterUrl}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 200px, 50vw"
                          className="object-cover transition-transform group-hover:scale-[1.02]"
                        />
                        <PreviewOverlay
                          trailerProvider={b.trailerProvider}
                          trailerVideoId={b.trailerVideoId}
                          titleText={b.title}
                        />
                      </div>
                    ) : (
                      <div className="aspect-[2/3] rounded-md border border-border bg-muted" />
                    )}
                    <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">
                      {b.title}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {MEDIA_TYPE_LABEL[b.mediaType] ?? b.mediaType}
                      {b.themeName ? ` · Shares the ${b.themeName.toLowerCase()} theme` : ''}
                    </p>
                  </Link>
                  <RecCardActions titleId={b.id} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-baseline justify-between">
          <CardTitle>Where to watch</CardTitle>
          {lastVerified ? (
            <span className="text-xs font-normal text-muted-foreground">
              Last verified {formatRelativeTime(lastVerified)}
            </span>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm text-text-body">
          {streamingRows.length === 0 ? (
            <p>No streaming availability data for this title yet.</p>
          ) : primaryByType.size === 0 ? (
            <p>
              Not currently available in {primaryCountry}.
              {otherCountries.size > 0 ? (
                <>
                  {' '}
                  Available in {otherCountries.size}{' '}
                  {otherCountries.size === 1 ? 'other region' : 'other regions'}.
                </>
              ) : null}
            </p>
          ) : (
            <div className="space-y-4">
              {STREAMING_TYPE_ORDER.map((type) => {
                const providers = primaryByType.get(type);
                if (!providers || providers.length === 0) return null;
                return (
                  <div key={type}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {STREAMING_TYPE_LABEL[type]}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {providers.map((p) => (
                        <span
                          key={p.providerId}
                          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5"
                          title={p.providerName}
                        >
                          {p.providerLogoUrl ? (
                            <Image
                              src={p.providerLogoUrl}
                              alt=""
                              width={20}
                              height={20}
                              className="rounded-sm"
                            />
                          ) : null}
                          <span className="text-sm text-foreground">{p.providerName}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-baseline justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>
                  Showing {primaryCountry}.
                  {otherCountries.size > 0 ? (
                    <>
                      {' '}
                      Available in {otherCountries.size}{' '}
                      {otherCountries.size === 1 ? 'other region' : 'other regions'}.
                    </>
                  ) : null}
                </span>
                {primarySourceUrl ? (
                  <a
                    href={primarySourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    More details ↗
                  </a>
                ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
