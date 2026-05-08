'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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

// Three quick-actions on each dashboard rec card. All three trigger
// `router.refresh()` on success so the dashboard re-runs
// recommendations.list (which excludes dismissed titles + library titles
// at read time) — the card disappears immediately on hide/seen, no
// nightly cron wait.
export function RecCardActions({ titleId }: RecCardActionsProps) {
  const router = useRouter();
  const [ratePopoverOpen, setRatePopoverOpen] = useState(false);

  const watchUpsert = trpc.watch.upsert.useMutation({
    onSuccess: () => router.refresh(),
  });
  const recFeedbackUpsert = trpc.recFeedback.upsert.useMutation({
    onSuccess: () => {
      setRatePopoverOpen(false);
      router.refresh();
    },
  });

  const onSeenIt = () => {
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

  const isPending = watchUpsert.isPending || recFeedbackUpsert.isPending;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        onClick={onSeenIt}
        disabled={isPending}
        className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
      >
        Seen it
      </button>
      <button
        type="button"
        onClick={onNotInterested}
        disabled={isPending}
        className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
      >
        Hide
      </button>

      {/* Rate popover. Lightweight inline implementation — opens a small
          row of 5 labels under the button when clicked. shadcn Popover
          would be heavier than warranted for a single-action surface. */}
      <div className="relative">
        <button
          type="button"
          aria-label="Rate this recommendation"
          onClick={() => setRatePopoverOpen((v) => !v)}
          disabled={isPending}
          className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
        >
          Rate
        </button>
        {ratePopoverOpen ? (
          <div className="absolute left-0 top-full z-10 mt-1 flex flex-col rounded-md border border-slate-200 bg-white p-1 shadow-lg">
            {RATING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onRate(opt.value)}
                disabled={isPending}
                className="rounded px-3 py-1 text-left text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
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
