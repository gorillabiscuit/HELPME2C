'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Check, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { RatingFace } from '@/components/rating-face';
import { cn } from '@/lib/utils';

type WatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

interface CurrentState {
  status: WatchStatus | null;
  rating: number | null;
}

interface TitleQuickActionsProps {
  titleId: string;
  // Current state if the user already has a watch_entry for this title.
  // null means "no entry yet" — used by rec cards which only ever show
  // titles the user hasn't engaged with. The Add tab + onboarding pass
  // the actual current state so the buttons can reflect it.
  currentState: CurrentState | null;
  // Visual density. "card" = standard rec-card layout (default).
  // "compact" = smaller buttons for tight grids.
  size?: 'card' | 'compact';
  // Optional: fires after any state-changing mutation succeeds. The
  // /taste Add tab + onboarding picker use this to fade the card out
  // and replace it with the next title — keeps the rating flow moving
  // without making the user re-locate the next card after each action.
  onActionComplete?: () => void;
}

// Single source of truth for "what can I do with this title?" Used on:
//   - Dashboard rec cards (no prior state)
//   - /taste Add tab posters (state-aware)
//   - Onboarding picker posters (state-aware)
//
// Actions:
//   - Watched it  → tracking + status=completed; expands a 1-10 rating
//                   selector with a Skip option.
//   - Want to watch → tracking + status=plan_to_watch.
//   - Not interested → records dismissal in rec_feedback so the engine
//                      suppresses the title; doesn't add a library entry.
//
// State-aware reflection: if currentState shows the title is already
// in library with status=completed and a rating, the Watched it button
// is highlighted and clicking re-opens the rating row for a change.
// Same idea for Want to watch.
export function TitleQuickActions({
  titleId,
  currentState,
  size = 'card',
  onActionComplete,
}: TitleQuickActionsProps) {
  const router = useRouter();
  const [ratingOpen, setRatingOpen] = useState(false);

  const watchUpsert = trpc.watch.upsert.useMutation({
    onSuccess: () => {
      setRatingOpen(false);
      router.refresh();
      onActionComplete?.();
    },
  });
  const recFeedbackUpsert = trpc.recFeedback.upsert.useMutation({
    onSuccess: () => {
      router.refresh();
      onActionComplete?.();
    },
  });

  const isWatched = currentState?.status === 'completed';
  const isPlanToWatch = currentState?.status === 'plan_to_watch';
  const existingRating = currentState?.rating ?? null;

  const onWatchedWithRating = (rating: number | null) => {
    watchUpsert.mutate(
      rating === null
        ? { titleId, kind: 'tracking', status: 'completed' }
        : { titleId, kind: 'tracking', status: 'completed', rating },
    );
  };

  const onWantToWatch = () => {
    watchUpsert.mutate({ titleId, kind: 'tracking', status: 'plan_to_watch' });
  };

  const onNotInterested = () => {
    recFeedbackUpsert.mutate({ titleId, dismissed: true });
  };

  const isPending = watchUpsert.isPending || recFeedbackUpsert.isPending;

  // Tight layout uses smaller buttons; card layout matches the rec-card
  // density that was already in production. Compact buttons stay at
  // ~28px tall (px-2.5 py-1.5 + text-[11px]) — comfortably above the
  // WCAG 2.5.8 AA 24px target-size minimum while keeping the dense
  // grid layout legible.
  const buttonBase =
    size === 'compact'
      ? 'inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50'
      : 'inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50';
  const iconSize = size === 'compact' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const onState = 'border-foreground bg-foreground text-primary-foreground hover:bg-foreground/90';
  const offState =
    'border-border text-text-body hover:border-input hover:bg-muted hover:text-foreground';

  return (
    <div className={cn('space-y-1.5', size === 'compact' ? 'mt-1.5' : 'mt-2')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setRatingOpen((v) => !v)}
          disabled={isPending}
          aria-expanded={ratingOpen}
          aria-pressed={isWatched}
          title={
            isWatched && existingRating !== null
              ? `Watched · rated ${existingRating}/10. Click to change.`
              : 'Mark as watched — pick a rating to shape future recs.'
          }
          className={cn(buttonBase, isWatched || ratingOpen ? onState : offState)}
        >
          <Check className={iconSize} aria-hidden="true" />
          <span>
            {isWatched && existingRating !== null
              ? `Watched · ${existingRating}/10`
              : isWatched
                ? 'Watched'
                : 'Watched it'}
          </span>
        </button>
        <button
          type="button"
          onClick={onWantToWatch}
          disabled={isPending}
          aria-pressed={isPlanToWatch}
          title="Add to your library as 'plan to watch'."
          className={cn(buttonBase, isPlanToWatch ? onState : offState)}
        >
          <Bookmark className={iconSize} aria-hidden="true" />
          <span>{isPlanToWatch ? 'On your list' : 'Want to watch'}</span>
        </button>
        <button
          type="button"
          onClick={onNotInterested}
          disabled={isPending}
          title="We won't suggest this again."
          className={cn(buttonBase, offState)}
        >
          <X className={iconSize} aria-hidden="true" />
          <span>Not interested</span>
        </button>
      </div>

      {ratingOpen ? (
        <div className="rounded-md border border-border bg-muted/40 p-2">
          <p className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            {existingRating !== null
              ? `Currently ${existingRating}/10 — change it?`
              : 'How would you rate it? 1 = hated · 10 = loved'}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onWatchedWithRating(n)}
                disabled={isPending}
                className={cn(
                  'flex h-12 w-9 flex-col items-center justify-center gap-0.5 rounded-md border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50',
                  n === existingRating
                    ? 'border-foreground bg-foreground text-primary-foreground'
                    : 'border-border bg-white text-foreground hover:bg-foreground hover:text-primary-foreground',
                )}
              >
                <span>{n}</span>
                <RatingFace rating={n} size="sm" inheritColor={n === existingRating} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => onWatchedWithRating(null)}
              disabled={isPending}
              className="ml-1 self-stretch rounded-md border border-border bg-white px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Skip rating
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
