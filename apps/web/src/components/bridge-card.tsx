'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PreviewOverlay } from '@/components/preview-overlay';
import { TitleQuickActions } from '@/components/title-quick-actions';

type MediaType = 'tv' | 'film' | 'anime';

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  tv: 'TV series',
  film: 'Film',
  anime: 'Anime',
};

interface BridgeCardProps {
  id: string;
  title: string;
  mediaType: MediaType;
  posterUrl: string | null;
  trailerProvider: string | null;
  trailerVideoId: string | null;
  themeName: string | null;
}

// A single card in the "more shows with the same themes" section on the
// title detail page. Client component so it can track its own hidden
// state — when the user clicks Watched-it / Want-to-watch / Not-
// interested, the card vanishes locally so the user gets immediate
// feedback. The bridges query already excludes titles the user has
// touched, so on the next router.refresh the card won't reappear (a
// new bridge takes its slot).
export function BridgeCard({
  id,
  title,
  mediaType,
  posterUrl,
  trailerProvider,
  trailerVideoId,
  themeName,
}: BridgeCardProps) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <li>
      <Link
        href={`/titles/${id}`}
        className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
      >
        {posterUrl ? (
          <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-muted">
            <Image
              src={posterUrl}
              alt=""
              fill
              sizes="(min-width: 640px) 200px, 50vw"
              className="object-cover transition-transform group-hover:scale-[1.02]"
            />
            <PreviewOverlay
              trailerProvider={trailerProvider}
              trailerVideoId={trailerVideoId}
              titleText={title}
            />
          </div>
        ) : (
          <div className="aspect-[2/3] rounded-md border border-border bg-muted" />
        )}
        <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {MEDIA_TYPE_LABEL[mediaType] ?? mediaType}
          {themeName ? ` · Shares the ${themeName.toLowerCase()} theme` : ''}
        </p>
      </Link>
      <TitleQuickActions
        titleId={id}
        currentState={null}
        onActionComplete={() => setHidden(true)}
      />
    </li>
  );
}
