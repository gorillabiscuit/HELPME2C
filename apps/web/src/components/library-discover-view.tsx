'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { PreviewOverlay } from '@/components/preview-overlay';
import { TitleQuickActions } from '@/components/title-quick-actions';

type MediaType = 'tv' | 'film' | 'anime';

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

// Surface for "build up my taste signal" — a grid of popular titles
// with the Watched-it / Want-to-watch / Not-interested quick-action
// buttons under each card. Replaces the old /onboarding picker's
// permanent home (which lived on /taste's Add tab before the
// library merge).
//
// titles.popular already does franchise dedup + media-type round-
// robin so a new user sees variety. Cards fade out locally on
// action click for immediate feedback; router.refresh re-fetches
// the page so the next batch of popular titles can take their slot.
//
// Not in scope (yet): search bar to find specific titles by name —
// /search already exists for that. Could be merged later if alpha
// testers want one-stop "browse + search" here.
export function LibraryDiscoverView() {
  const popularQuery = trpc.titles.popular.useQuery({
    limit: 24,
    excludeUserEntries: true,
  });
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  if (popularQuery.isLoading) {
    return <p className="text-sm text-text-body">Loading popular titles…</p>;
  }

  const titles = (popularQuery.data ?? []).filter((t) => !hidden.has(t.id));

  if (titles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm text-text-body">
          No more popular titles to show. Use <strong>Search</strong> to find specific shows you
          want to rate.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-text-body">
        Popular shows to rate. The more you rate, the sharper your recommendations get. Click any
        card to see details, or use the buttons below each one to mark it as watched, plan to watch,
        or not for you.
      </p>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {titles.map((t) => (
          <li key={t.id}>
            <Link
              href={`/titles/${t.id}`}
              className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
            >
              {t.posterUrl ? (
                <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-muted">
                  <Image
                    src={t.posterUrl}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 180px, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform group-hover:scale-[1.02]"
                  />
                  <PreviewOverlay
                    trailerProvider={t.trailerProvider}
                    trailerVideoId={t.trailerVideoId}
                    titleText={t.title}
                  />
                </div>
              ) : (
                <div className="aspect-[2/3] rounded-md border border-border bg-muted" />
              )}
              <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">{t.title}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {[MEDIA_TYPE_LABEL[t.mediaType] ?? t.mediaType, t.releaseYear?.toString()]
                  .filter((s): s is string => Boolean(s))
                  .join(' · ')}
              </p>
            </Link>
            <TitleQuickActions
              titleId={t.id}
              currentState={null}
              size="compact"
              onActionComplete={() =>
                setHidden((current) => {
                  const next = new Set(current);
                  next.add(t.id);
                  return next;
                })
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
