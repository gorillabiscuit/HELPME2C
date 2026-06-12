'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Check, Heart, HelpCircle, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { BUCKET_LABEL, bucketForRating } from '@/components/rating-face';

// 3-point rating scale (replaces 1–10 grid).
// Research basis: Netflix's stars-to-thumbs switch doubled rating volume because
// graded scales require analytical introspection that degrades signal quality
// (Wilson & Schooler 1991). Three points captures the meaningful gradient
// (strong negative / positive / strong positive) without forced precision.
// Values chosen to stay compatible with existing recommendation thresholds:
//   rating >= 7  = liked (unchanged in recommendation engine)
//   rating < 7   = disliked (unchanged)
const RATING_OPTIONS = [
  { label: "Didn't like it", value: 3, Icon: ThumbsDown },
  { label: 'Liked it', value: 7, Icon: ThumbsUp },
  { label: 'Loved it', value: 10, Icon: Heart },
] as const;

type RatingValue = (typeof RATING_OPTIONS)[number]['value'];

// labelForRating: use BUCKET_LABEL[bucketForRating(r)] from rating-face.tsx
// — single source of truth for display labels.
function labelForRating(rating: number): string {
  return BUCKET_LABEL[bucketForRating(rating)];
}

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
//   - Don't know it → pure client-side dismiss. No mutation, no signal
//                     recorded — just slides the card out of view so the
//                     next one takes its place. Distinct from "Not
//                     interested" (which is negative signal): "Don't
//                     know it" means the user has no opinion because
//                     they don't recognise the show. Critical for the
//                     onboarding flow where forcing a judgment on an
//                     unfamiliar show was polluting the taste vector.
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
  const [dismissReasonOpen, setDismissReasonOpen] = useState(false);
  const [dismissalToast, setDismissalToast] = useState<string | null>(null);

  const recFeedbackUpsert = trpc.recFeedback.upsert.useMutation({
    onSuccess: () => {
      setDismissReasonOpen(false);
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
    setDismissReasonOpen(true);
  };

  const DISMISSAL_REASON_LABELS: {
    value: 'too_dark' | 'too_violent' | 'not_in_mood' | 'already_seen' | 'not_my_thing';
    label: string;
    toast: string;
  }[] = [
    { value: 'too_dark', label: 'Too dark', toast: "Got it — we'll show you fewer dark shows" },
    {
      value: 'too_violent',
      label: 'Too violent',
      toast: "Got it — we'll show you less violent content",
    },
    {
      value: 'not_in_mood',
      label: 'Not in the mood',
      toast: "We'll bring this back in a few days",
    },
    {
      value: 'already_seen',
      label: 'Already seen it',
      toast: "Noted — we'll keep it out of your queue",
    },
    { value: 'not_my_thing', label: 'Not my thing', toast: 'Got it — thanks for the feedback' },
  ];

  const confirmDismissal = (
    reason?: 'too_dark' | 'too_violent' | 'not_in_mood' | 'already_seen' | 'not_my_thing',
  ) => {
    const toast = reason
      ? (DISMISSAL_REASON_LABELS.find((r) => r.value === reason)?.toast ?? null)
      : null;
    if (toast) {
      setDismissalToast(toast);
      setTimeout(() => setDismissalToast(null), 3000);
    }
    recFeedbackUpsert.mutate({ titleId, dismissed: true, dismissalReason: reason });
  };

  // "Don't know it" records a soft signal on rec_feedback.unfamiliar
  // (per the schema added 2026-05-15). NOT used for engine exclusion
  // — the user explicitly wanted these tracked but still surfaceable
  // for future recs (maybe they'll recognise the title later, or
  // we'll learn things from the aggregate "X% of users don't know
  // this show" pattern). The card hides locally via onActionComplete
  // so the user moves on to the next one.
  const onDontKnow = () => {
    recFeedbackUpsert.mutate({ titleId, unfamiliar: true });
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
              ? `${labelForRating(existingRating)} — click to change.`
              : 'Mark as watched — tell us how you felt about it.'
          }
          className={cn(buttonBase, isWatched || ratingOpen ? onState : offState)}
        >
          <Check className={iconSize} aria-hidden="true" />
          <span>
            {isWatched && existingRating !== null
              ? `Watched · ${labelForRating(existingRating)}`
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
          className={cn(buttonBase, dismissReasonOpen ? onState : offState)}
        >
          <X className={iconSize} aria-hidden="true" />
          <span>Not interested</span>
        </button>
        {/* Only render Don't-know-it when the parent has wired
            onActionComplete — otherwise the click would be a silent
            no-op (no DB mutation, no card hide). Dashboard rec cards
            don't currently support per-card hiding so the button stays
            absent there. Onboarding/Discover/Bridges all pass
            onActionComplete and get the button. */}
        {onActionComplete ? (
          <button
            type="button"
            onClick={onDontKnow}
            disabled={isPending}
            title="Skip this one — show me a different show. No signal recorded."
            className={cn(buttonBase, offState)}
          >
            <HelpCircle className={iconSize} aria-hidden="true" />
            <span>Don&apos;t know it</span>
          </button>
        ) : null}
      </div>

      {/* Two-step dismissal: reason chips appear after "Not interested" click */}
      {dismissReasonOpen ? (
        <div className="rounded-md border border-border bg-muted/40 p-2">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Why not?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DISMISSAL_REASON_LABELS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => confirmDismissal(value)}
                disabled={isPending}
                className="rounded-full border border-border bg-background px-3 py-1 text-[11px] transition-colors hover:border-foreground hover:bg-muted disabled:opacity-50"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => confirmDismissal()}
              disabled={isPending}
              className="rounded-full border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>
      ) : null}

      {/* Confirmed feedback toast */}
      {dismissalToast ? (
        <p className="text-[11px] text-muted-foreground">{dismissalToast}</p>
      ) : null}

      {ratingOpen ? (
        <div className="rounded-md border border-border bg-muted/40 p-2">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            {existingRating !== null ? 'Change your rating' : 'How did you find it?'}
          </p>
          <div className="flex items-center gap-1.5">
            {RATING_OPTIONS.map(({ label, value, Icon }) => {
              const isActive = existingRating === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onWatchedWithRating(value as RatingValue)}
                  disabled={isPending}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50',
                    isActive
                      ? 'border-foreground bg-foreground text-primary-foreground'
                      : 'border-border bg-white text-foreground hover:bg-foreground hover:text-primary-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onWatchedWithRating(null)}
              disabled={isPending}
              className="self-stretch rounded-md border border-border bg-white px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
