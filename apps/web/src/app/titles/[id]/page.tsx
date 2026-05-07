import { and, eq, desc } from 'drizzle-orm';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db } from '@/server/db';
import {
  streamingAvailability,
  tags,
  titleTags,
  titles,
  users,
  watchEntries,
} from '@/server/schema';
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

  // Streaming summary only — count distinct providers + countries.
  // Per-region "where to watch" rendering lands in M5 (streaming surface)
  // alongside the user's connected-providers filter.
  const streamingRows = await db
    .select({
      providerId: streamingAvailability.providerId,
      providerName: streamingAvailability.providerName,
      countryCode: streamingAvailability.countryCode,
      type: streamingAvailability.type,
    })
    .from(streamingAvailability)
    .where(eq(streamingAvailability.titleId, id));

  const distinctProviders = new Set(streamingRows.map((r) => r.providerName));
  const distinctCountries = new Set(streamingRows.map((r) => r.countryCode));

  // The current user's existing watch_entry for this title, if any.
  // Joined via users.clerk_id since watch_entries.user_id is the internal
  // uuid. Returns at most one row by the (user_id, title_id) UNIQUE index.
  const [userEntryRow] = await db
    .select({
      kind: watchEntries.kind,
      status: watchEntries.status,
    })
    .from(watchEntries)
    .innerJoin(users, eq(watchEntries.userId, users.id))
    .where(and(eq(users.clerkId, clerkUserId), eq(watchEntries.titleId, id)))
    .limit(1);

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
      <div className="mb-6">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Home
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-[200px_1fr]">
        {title.posterUrl ? (
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            <Image
              src={title.posterUrl}
              alt={`${title.title} poster`}
              fill
              sizes="(min-width: 640px) 200px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="aspect-[2/3] rounded-lg border border-slate-200 bg-slate-100" />
        )}

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title.title}</h1>
          {title.originalTitle && title.originalTitle !== title.title ? (
            <p className="mt-1 text-sm text-slate-500">{title.originalTitle}</p>
          ) : null}

          <p className="mt-3 text-sm text-slate-600">
            {[mediaTypeLabel, yearLabel, episodeLabel, statusLabel]
              .filter((s): s is string => Boolean(s))
              .join(' · ')}
          </p>

          {title.synopsis ? (
            <p className="mt-4 text-sm leading-relaxed text-slate-700">{title.synopsis}</p>
          ) : null}

          <div className="mt-6">
            <TitleDetailAddButton
              titleId={title.id}
              initialEntry={
                userEntryRow ? { kind: userEntryRow.kind, status: userEntryRow.status } : null
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
                  className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Where to watch</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          {streamingRows.length === 0 ? (
            <p>No streaming availability data for this title yet.</p>
          ) : (
            <p>
              Available on {distinctProviders.size}{' '}
              {distinctProviders.size === 1 ? 'provider' : 'providers'} across{' '}
              {distinctCountries.size} {distinctCountries.size === 1 ? 'country' : 'countries'}.{' '}
              <span className="text-slate-400">
                Per-region details land in M5 alongside the user-subscriptions filter.
              </span>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
