'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Bookmark, Check, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface RecCardActionsProps {
  titleId: string;
}

// Three actions per rec card under the rated-taste model.
//
//   - Watched it → expands a 1-10 rating row. Submitting marks the title
//     as tracking + status=completed + the chosen rating. The rating is
//     the signal — high ratings auto-become anchor-strength in the rec
//     engine.
//   - Want to watch → tracking + status=plan_to_watch. Soft positive
//     signal; card disappears.
//   - Not interested → dismisses without library entry; the title is
//     suppressed from future recs.
//
// All three trigger router.refresh() so recommendations.list re-runs
// (which excludes library titles + dismissed-via-rec-feedback titles).
export function RecCardActions({ titleId }: RecCardActionsProps) {
  const router = useRouter();
  const [ratingOpen, setRatingOpen] = useState(false);

  const watchUpsert = trpc.watch.upsert.useMutation({
    onSuccess: () => router.refresh(),
  });
  const recFeedbackUpsert = trpc.recFeedback.upsert.useMutation({
    onSuccess: () => router.refresh(),
  });

  const onWatchedWithRating = (rating: number | null) => {
    watchUpsert.mutate(
      rating === null
        ? { titleId, kind: 'tracking', status: 'completed' }
        : { titleId, kind: 'tracking', status: 'completed', rating },
    );
    setRatingOpen(false);
  };

  const onWantToWatch = () => {
    watchUpsert.mutate({ titleId, kind: 'tracking', status: 'plan_to_watch' });
  };

  const onNotInterested = () => {
    recFeedbackUpsert.mutate({ titleId, dismissed: true });
  };

  const isPending = watchUpsert.isPending || recFeedbackUpsert.isPending;

  return (
    <div className="mt-2 space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setRatingOpen((v) => !v)}
          disabled={isPending}
          aria-expanded={ratingOpen}
          title="Mark this as watched — pick a rating to shape future recs."
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50',
            ratingOpen
              ? 'border-foreground bg-foreground text-primary-foreground'
              : 'border-border text-text-body hover:border-input hover:bg-muted hover:text-foreground',
          )}
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Watched it</span>
        </button>
        <button
          type="button"
          onClick={onWantToWatch}
          disabled={isPending}
          title="Add to your library as 'plan to watch'."
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-text-body transition-colors hover:border-input hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Want to watch</span>
        </button>
        <button
          type="button"
          onClick={onNotInterested}
          disabled={isPending}
          title="We won't suggest this again."
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-text-body transition-colors hover:border-input hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Not interested</span>
        </button>
      </div>

      {ratingOpen ? (
        <div className="rounded-md border border-border bg-muted/40 p-2">
          <p className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            How would you rate it? (10 = loved it · 1 = hated it)
          </p>
          <div className="flex flex-wrap items-center gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onWatchedWithRating(n)}
                disabled={isPending}
                className={cn(
                  'h-7 w-7 rounded-md border border-border bg-white text-xs font-medium text-foreground transition-colors hover:bg-foreground hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50',
                  n >= 9 && 'border-foreground/60',
                )}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onWatchedWithRating(null)}
              disabled={isPending}
              className="ml-1 rounded-md border border-border bg-white px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Skip rating
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
