'use client';

import Image from 'next/image';
import { Shuffle, Star } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

type MediaType = 'tv' | 'film' | 'anime';

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

// Compare view (formerly /taste Compare tab — folded into library per
// the 2026-05-14 surface-merge decision). Pairwise comparison flow that
// updates the Elo score on each watch_entry the user has rated. Two
// posters side by side; pick the one you'd rather watch, get a new pair.
export function LibraryCompareView() {
  const pairQuery = trpc.watch.getPairwisePair.useQuery(undefined, { refetchOnMount: 'always' });
  const recordPairwise = trpc.watch.recordPairwise.useMutation({
    onSuccess: () => pairQuery.refetch(),
  });

  if (pairQuery.isLoading) {
    return <p className="text-sm text-text-body">Loading a pair…</p>;
  }

  const pair = pairQuery.data;
  if (!pair) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-base text-text-body">
          Comparison needs at least two rated titles. Add a couple of shows you&apos;ve watched and
          rate them — then come back here to refine the ranking.
        </p>
      </div>
    );
  }

  const onPick = (winnerTitleId: string, loserTitleId: string) => {
    recordPairwise.mutate({ winnerTitleId, loserTitleId });
  };

  return (
    <div>
      <p className="mb-6 text-sm text-text-body">
        Which one do you prefer? Click the poster you&apos;d rather watch — we&apos;ll use that to
        adjust your ranking. Keep going for as long as you want.
      </p>
      {/* Posters capped at ~220px each — the bigger version overwhelmed
          the viewport. User can still read the title + year below; the
          poster is just the visual cue for "which one?" */}
      <div className="mx-auto grid max-w-md grid-cols-2 gap-4">
        <ComparisonCard
          title={pair.a.title}
          onPick={() => onPick(pair.a.titleId, pair.b.titleId)}
          disabled={recordPairwise.isPending}
        />
        <ComparisonCard
          title={pair.b.title}
          onPick={() => onPick(pair.b.titleId, pair.a.titleId)}
          disabled={recordPairwise.isPending}
        />
      </div>
      <div className="mt-6 flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => pairQuery.refetch()}
          disabled={recordPairwise.isPending || pairQuery.isFetching}
        >
          <Shuffle className="h-4 w-4" aria-hidden="true" />
          Skip this pair
        </Button>
      </div>
    </div>
  );
}

interface ComparisonCardProps {
  title: {
    id: string;
    title: string;
    mediaType: MediaType;
    releaseYear: number | null;
    posterUrl: string | null;
  };
  onPick: () => void;
  disabled: boolean;
}

function ComparisonCard({ title, onPick, disabled }: ComparisonCardProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className="group block w-full rounded-lg text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border-2 border-border bg-muted transition group-hover:border-foreground group-hover:shadow-md">
        {title.posterUrl ? (
          <Image
            src={title.posterUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 320px, 50vw"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/60 py-3 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
          <Star className="mr-1 h-4 w-4" aria-hidden="true" />
          Pick this one
        </div>
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">{title.title}</h3>
      <p className="text-sm text-muted-foreground">
        {[MEDIA_TYPE_LABEL[title.mediaType], title.releaseYear?.toString()]
          .filter((s): s is string => Boolean(s))
          .join(' · ')}
      </p>
    </button>
  );
}
