'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Bookmark, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { LibraryEditDialog } from '@/components/library-edit-dialog';
import { cn } from '@/lib/utils';

type WatchKind = 'anchor' | 'tracking';
type WatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

interface InitialEntry {
  kind: WatchKind;
  status: WatchStatus | null;
  rating: number | null;
  currentEpisode: number | null;
  notes: string | null;
  privacy: 'public' | 'private' | 'friends' | null;
}

interface TitleDetailAddButtonProps {
  titleId: string;
  titleText: string;
  hasEpisodes: boolean;
  initialEntry: InitialEntry | null;
}

const STATUS_LABEL: Record<WatchStatus, string> = {
  watching: 'Watching',
  completed: 'Watched',
  on_hold: 'On hold',
  dropped: 'Dropped',
  plan_to_watch: 'Want to watch',
};

// Title-detail action area under the rated-taste model.
//
// No prior entry → two intent buttons:
//   - "Want to watch" (status=plan_to_watch)
//   - "I've seen it" → expands a 1-10 rating row; submit marks
//     status=completed and the chosen rating (or skip).
//
// Prior entry → status badge + Edit dialog. Editing the entry is where
// status, rating, episode progress, and notes change. The dialog is
// shared with the library list.
export function TitleDetailAddButton({
  titleId,
  titleText,
  hasEpisodes,
  initialEntry,
}: TitleDetailAddButtonProps) {
  const router = useRouter();
  const [ratingOpen, setRatingOpen] = useState(false);

  const upsertMutation = trpc.watch.upsert.useMutation({
    onSuccess: () => {
      setRatingOpen(false);
      router.refresh();
    },
  });

  const onWantToWatch = () => {
    upsertMutation.mutate({ titleId, kind: 'tracking', status: 'plan_to_watch' });
  };

  const onWatchedWithRating = (rating: number | null) => {
    upsertMutation.mutate(
      rating === null
        ? { titleId, kind: 'tracking', status: 'completed' }
        : { titleId, kind: 'tracking', status: 'completed', rating },
    );
  };

  // No entry yet — show the two intent buttons.
  if (!initialEntry) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onWantToWatch} disabled={upsertMutation.isPending} variant="outline">
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            Want to watch
          </Button>
          <Button
            onClick={() => setRatingOpen((v) => !v)}
            disabled={upsertMutation.isPending}
            aria-expanded={ratingOpen}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            I&apos;ve seen it
          </Button>
        </div>

        {ratingOpen ? (
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
              How would you rate it? (10 = loved it · 1 = hated it)
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onWatchedWithRating(n)}
                  disabled={upsertMutation.isPending}
                  className={cn(
                    'h-8 w-8 rounded-md border border-border bg-white text-sm font-medium text-foreground transition-colors hover:bg-foreground hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50',
                    n >= 9 && 'border-foreground/60',
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onWatchedWithRating(null)}
                disabled={upsertMutation.isPending}
                className="ml-1 rounded-md border border-border bg-white px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Skip rating
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Entry exists — show status + rating, with Edit dialog to change.
  const statusLabel =
    initialEntry.status && STATUS_LABEL[initialEntry.status]
      ? STATUS_LABEL[initialEntry.status]
      : 'In your library';

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-md border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
        In your library · {statusLabel}
        {initialEntry.rating !== null ? (
          <span className="ml-2 text-muted-foreground">· {initialEntry.rating}/10</span>
        ) : null}
      </span>
      <LibraryEditDialog
        titleId={titleId}
        titleText={titleText}
        hasEpisodes={hasEpisodes}
        initialEntry={{
          status: initialEntry.status,
          rating: initialEntry.rating,
          currentEpisode: initialEntry.currentEpisode,
          notes: initialEntry.notes,
          privacy: initialEntry.privacy,
        }}
      />
    </div>
  );
}
