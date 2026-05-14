import { Frown, Heart, Meh, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

// Per ADR-0024: ratings 1-10 carry bipolar semantics. Iconography
// makes the meaning explicit so users understand what their rating
// is telling the engine.
//
//   1-3  → Disliked (Frown, destructive-toned)
//   4-6  → Mixed    (Meh, muted)
//   7-9  → Liked    (Smile, foreground)
//   10   → Loved    (Heart, primary)
//
// Used in every rating widget: edit dialog picker, quick-actions
// rating row, and read-only display next to integer ratings in
// the library / ranked views.

export type RatingBucket = 'disliked' | 'mixed' | 'liked' | 'loved';

export function bucketForRating(rating: number): RatingBucket {
  if (rating >= 10) return 'loved';
  if (rating >= 7) return 'liked';
  if (rating >= 4) return 'mixed';
  return 'disliked';
}

const BUCKET_LABEL: Record<RatingBucket, string> = {
  disliked: 'Disliked',
  mixed: 'Mixed',
  liked: 'Liked',
  loved: 'Loved',
};

const BUCKET_ICON_CLASS: Record<RatingBucket, string> = {
  disliked: 'text-destructive',
  mixed: 'text-muted-foreground',
  liked: 'text-foreground',
  loved: 'text-rose-500',
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
  const Icon =
    bucket === 'disliked' ? Frown : bucket === 'mixed' ? Meh : bucket === 'liked' ? Smile : Heart;
  const iconClass = cn(
    inheritColor ? 'text-current' : BUCKET_ICON_CLASS[bucket],
    size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
    bucket === 'loved' ? 'fill-current' : undefined,
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
