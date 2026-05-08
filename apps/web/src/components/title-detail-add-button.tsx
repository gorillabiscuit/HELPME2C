'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { LibraryEditDialog } from '@/components/library-edit-dialog';

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

export function TitleDetailAddButton({
  titleId,
  titleText,
  hasEpisodes,
  initialEntry,
}: TitleDetailAddButtonProps) {
  const router = useRouter();

  const upsertMutation = trpc.watch.upsert.useMutation({
    // Re-render the server component so the just-saved entry is reflected
    // (the page's initialEntry prop becomes the new row). Cheaper than
    // managing optimistic state and avoids drift if the mutation fails.
    onSuccess: () => router.refresh(),
  });

  // Path A: not on the user's list → "Add to list" creates a tracking row
  // with status=plan_to_watch. The user can then upgrade status / set rating
  // via the LibraryEditDialog that this component renders on the next visit.
  if (!initialEntry) {
    return (
      <Button
        onClick={() =>
          upsertMutation.mutate({ titleId, kind: 'tracking', status: 'plan_to_watch' })
        }
        disabled={upsertMutation.isPending}
      >
        {upsertMutation.isPending ? 'Adding…' : 'Add to list'}
      </Button>
    );
  }

  // Path B: anchor pick → static badge. Anchors aren't statuses you change,
  // they're pinned taste picks; the edit-status / rating flow doesn't apply.
  // Anchor management lives on /onboarding.
  if (initialEntry.kind === 'anchor') {
    return (
      <span className="inline-flex items-center rounded-md border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
        On your list · Anchor pick
      </span>
    );
  }

  // Path C: tracking entry → status badge plus a LibraryEditDialog trigger
  // (its own "Edit" button). Click opens the dialog with the entry's
  // current rating, status, episode progress, and notes pre-filled. Saving
  // routes through watch.upsert (same path as the library list edit).
  const statusLabel = (initialEntry.status && STATUS_LABEL[initialEntry.status]) || 'On your list';
  return (
    <div className="inline-flex items-center gap-2">
      <span className="inline-flex items-center rounded-md border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
        On your list · {statusLabel}
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
        }}
      />
    </div>
  );
}
