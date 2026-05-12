'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { trpc } from '@/lib/trpc';

// Mirrors the rec_feedback_rating enum values. Hardcoded vs imported so
// the client bundle doesn't pull in @/server/* schema modules.
type RecRating = 'terrible' | 'bad' | 'ok' | 'good' | 'terrific';

const RATING_OPTIONS: ReadonlyArray<{ value: RecRating; label: string }> = [
  { value: 'terrible', label: 'Terrible' },
  { value: 'bad', label: 'Bad' },
  { value: 'ok', label: 'OK' },
  { value: 'good', label: 'Good' },
  { value: 'terrific', label: 'Terrific' },
];

interface RecCardActionsProps {
  titleId: string;
}

// Quick-actions on each dashboard rec card. All trigger `router.refresh()`
// on success so the dashboard re-runs recommendations.list (which excludes
// dismissed titles + library titles + loved titles at read time) — the
// card disappears immediately on any action, no nightly cron wait.
//
// Four actions, in order of "I have an opinion to express":
//   - Love this   → adds to taste (kind='anchor', loved=true). Card
//                   disappears (loved = engine excludes from candidates).
//   - Watched it  → adds as tracking + status=completed. Card disappears
//                   (library titles excluded from candidates).
//   - Rate        → records a rec_feedback rating (drives future tuning)
//                   and dismisses the card.
//   - Not interested → dismisses without rating.
//
// Tooltips on each via `title` attribute (lightweight; shadcn Tooltip
// would be heavier than warranted for four small buttons).
export function RecCardActions({ titleId }: RecCardActionsProps) {
  const router = useRouter();
  const [ratePopoverOpen, setRatePopoverOpen] = useState(false);

  const watchUpsert = trpc.watch.upsert.useMutation({
    onSuccess: () => router.refresh(),
  });
  const watchSetLoved = trpc.watch.setLoved.useMutation({
    onSuccess: () => router.refresh(),
  });
  const recFeedbackUpsert = trpc.recFeedback.upsert.useMutation({
    onSuccess: () => {
      setRatePopoverOpen(false);
      router.refresh();
    },
  });

  const onLoveThis = () => {
    watchSetLoved.mutate({ titleId, loved: true });
  };

  const onWatchedIt = () => {
    // Routes through the existing watch.upsert path — adds as a tracking
    // entry with status=completed. recommendations.list will exclude this
    // title from the next read since library titles are filtered at
    // read time (M6.2 addition).
    watchUpsert.mutate({ titleId, kind: 'tracking', status: 'completed' });
  };

  const onNotInterested = () => {
    recFeedbackUpsert.mutate({ titleId, dismissed: true });
  };

  const onRate = (rating: RecRating) => {
    // Rating implies the user has expressed an opinion on this rec, so
    // dismiss it from the dashboard alongside storing the rating. The
    // rating signal still lands in rec_feedback.rating for future
    // algorithm tuning per ROADMAP.md M6 — only the on-screen card
    // disappears.
    recFeedbackUpsert.mutate({ titleId, rating, dismissed: true });
  };

  const isPending = watchUpsert.isPending || watchSetLoved.isPending || recFeedbackUpsert.isPending;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        onClick={onLoveThis}
        disabled={isPending}
        title="Add to your taste — we'll recommend more like this."
        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-text-body transition-colors hover:border-input hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        <Heart className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Love this</span>
      </button>
      <button
        type="button"
        onClick={onWatchedIt}
        disabled={isPending}
        title="Marks this as completed in your library."
        className="rounded-md border border-border px-3 py-1.5 text-text-body transition-colors hover:border-input hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        Watched it
      </button>
      <button
        type="button"
        onClick={onNotInterested}
        disabled={isPending}
        title="We won't suggest this again."
        className="rounded-md border border-border px-3 py-1.5 text-text-body transition-colors hover:border-input hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        Not interested
      </button>

      {/* Rate popover. Lightweight inline implementation — opens a small
          row of 5 labels under the button when clicked. shadcn Popover
          would be heavier than warranted for a single-action surface. */}
      <div className="relative">
        <button
          type="button"
          aria-label="Rate this recommendation"
          title="How was this rec? Your rating shapes future suggestions."
          onClick={() => setRatePopoverOpen((v) => !v)}
          disabled={isPending}
          className="rounded-md border border-border px-3 py-1.5 text-text-body transition-colors hover:border-input hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          Rate
        </button>
        {ratePopoverOpen ? (
          <div className="absolute left-0 top-full z-10 mt-1 flex flex-col rounded-md border border-border bg-white p-1 shadow-lg">
            {RATING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onRate(opt.value)}
                disabled={isPending}
                className="rounded px-3 py-1 text-left text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
