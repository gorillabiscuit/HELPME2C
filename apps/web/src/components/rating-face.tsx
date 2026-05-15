import { Frown, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

// Per ADR-0024: ratings 1-10 carry bipolar semantics. Iconography on
// the picker shows ONLY the two extremes — a frown on 1, a smile on
// 10. Everything in between (2-9) gets no icon. Earlier versions
// labelled three buckets (disliked / mixed / liked) which the user
// found visually noisy; just bookending the scale is enough.
//
//   1     → Frown (destructive-toned)
//   2-9   → (no icon)
//   10    → Smile (foreground)

export type RatingBucket = 'hated' | 'middle' | 'loved';

export function bucketForRating(rating: number): RatingBucket {
  if (rating >= 10) return 'loved';
  if (rating <= 1) return 'hated';
  return 'middle';
}

const BUCKET_LABEL: Record<RatingBucket, string> = {
  hated: 'Hated it',
  middle: '',
  loved: 'Loved it',
};

const BUCKET_ICON_CLASS: Record<RatingBucket, string> = {
  hated: 'text-destructive',
  middle: 'text-muted-foreground',
  loved: 'text-foreground',
};

interface RatingFaceProps {
  rating: number;
  /** Icon size in tailwind sizing units. Default `h-4 w-4`. */
  size?: 'sm' | 'md';
  /** Show the label next to the icon. Default false (icon-only). */
  showLabel?: boolean;
  /** If true, drop the bucket-tinted icon color and inherit the parent's
   * text color (text-current). Use on dark/active backgrounds where the
   * default tints (text-foreground especially) would disappear. */
  inheritColor?: boolean;
  className?: string;
}

export function RatingFace({
  rating,
  size = 'sm',
  showLabel = false,
  inheritColor = false,
  className,
}: RatingFaceProps) {
  const bucket = bucketForRating(rating);
  // Only render at the two extremes; middle (2-9) gets no icon.
  if (bucket === 'middle') return null;
  const Icon = bucket === 'hated' ? Frown : Smile;
  const iconClass = cn(
    inheritColor ? 'text-current' : BUCKET_ICON_CLASS[bucket],
    size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
  );
  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      title={BUCKET_LABEL[bucket]}
      aria-label={BUCKET_LABEL[bucket]}
    >
      <Icon className={iconClass} aria-hidden="true" />
      {showLabel ? (
        <span className="text-xs font-medium text-muted-foreground">{BUCKET_LABEL[bucket]}</span>
      ) : null}
    </span>
  );
}
