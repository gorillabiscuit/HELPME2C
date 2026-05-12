'use client';

import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { LibraryEditDialog } from '@/components/library-edit-dialog';
import { cn } from '@/lib/utils';

// Minimal shape — declared inline rather than imported from @/server/* so
// the client bundle doesn't pull in server-side schema modules.
type WatchKind = 'anchor' | 'tracking';
type WatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

interface InitialEntry {
  kind: WatchKind;
  status: WatchStatus | null;
  rating: number | null;
  currentEpisode: number | null;
  notes: string | null;
  privacy: 'public' | 'private' | 'friends' | null;
  loved: boolean;
}

interface TitleDetailAddButtonProps {
  titleId: string;
  titleText: string;
  hasEpisodes: boolean;
  initialEntry: InitialEntry | null;
}

const STATUS_LABEL: Record<WatchStatus, string> = {
  watching: 'Watching',
  completed: 'Completed',
  on_hold: 'On hold',
  dropped: 'Dropped',
  plan_to_watch: 'Plan to watch',
};

// Title-detail action area under the unified-taste model. Two orthogonal
// affordances live side-by-side:
//
//   1. ♥ Love toggle — always present. Reflects loved=true regardless
//      of whether the user has also tracked the title in their library.
//      Adds to "your taste."
//   2. Library row — either an "Add to library" button (no tracking row
//      yet) or "In your library · {status}" + Edit (tracking row exists).
//
// Clicking ♥ writes a kind='anchor' row if none exists, or just flips
// the loved flag on an existing row. Clicking "Add to library" upserts
// kind='tracking' + status=plan_to_watch — graduates an anchor-only
// row to tracking without losing the loved flag.
export function TitleDetailAddButton({
  titleId,
  titleText,
  hasEpisodes,
  initialEntry,
}: TitleDetailAddButtonProps) {
  const router = useRouter();

  const upsertMutation = trpc.watch.upsert.useMutation({
    onSuccess: () => router.refresh(),
  });
  const setLovedMutation = trpc.watch.setLoved.useMutation({
    onSuccess: () => router.refresh(),
  });

  const isLoved = initialEntry?.loved === true;
  const hasTrackingEntry = initialEntry?.kind === 'tracking';
  const statusLabel =
    initialEntry?.status && STATUS_LABEL[initialEntry.status]
      ? STATUS_LABEL[initialEntry.status]
      : null;

  const onLoveToggle = () => {
    setLovedMutation.mutate({ titleId, loved: !isLoved });
  };

  const onAddToLibrary = () => {
    upsertMutation.mutate({ titleId, kind: 'tracking', status: 'plan_to_watch' });
  };

  const anyPending = setLovedMutation.isPending || upsertMutation.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* ♥ Love toggle */}
      <button
        type="button"
        onClick={onLoveToggle}
        disabled={anyPending}
        aria-pressed={isLoved}
        title={
          isLoved
            ? "Remove from your taste — we won't weight this when recommending."
            : "Add to your taste — we'll recommend more like this."
        }
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50',
          isLoved
            ? 'border-foreground bg-foreground text-primary-foreground hover:bg-foreground/90'
            : 'border-border text-foreground hover:border-input hover:bg-muted',
        )}
      >
        <Heart className={cn('h-4 w-4', isLoved ? 'fill-current' : '')} aria-hidden="true" />
        <span>{isLoved ? 'Loved' : 'Love this'}</span>
      </button>

      {/* Library row */}
      {hasTrackingEntry ? (
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
            In your library · {statusLabel ?? 'On your list'}
            {initialEntry?.rating !== null && initialEntry?.rating !== undefined ? (
              <span className="ml-2 text-muted-foreground">· {initialEntry.rating}/10</span>
            ) : null}
          </span>
          <LibraryEditDialog
            titleId={titleId}
            titleText={titleText}
            hasEpisodes={hasEpisodes}
            initialEntry={{
              status: initialEntry?.status ?? null,
              rating: initialEntry?.rating ?? null,
              currentEpisode: initialEntry?.currentEpisode ?? null,
              notes: initialEntry?.notes ?? null,
              privacy: initialEntry?.privacy ?? null,
            }}
          />
        </div>
      ) : (
        <Button onClick={onAddToLibrary} disabled={anyPending} variant="outline">
          {upsertMutation.isPending ? 'Adding…' : 'Add to library'}
        </Button>
      )}
    </div>
  );
}
