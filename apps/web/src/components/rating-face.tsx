import { Frown, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

// Per ADR-0024: ratings 1-10 carry bipolar semantics. Iconography
// makes the extremes visible — a frown at the low end and a smile
// at the high end. Mid-range (4-6) gets no icon to avoid cluttering
// the "mixed" zone with a neutral face that adds little info.
//
//   1-3  → Frown (destructive-toned)
//   4-6  → (no icon — mixed/neutral)
//   7-10 → Smile (foreground)

export type RatingBucket = 'disliked' | 'mixed' | 'liked';

export function bucketForRating(rating: number): RatingBucket {
  if (rating >= 7) return 'liked';
  if (rating >= 4) return 'mixed';
  return 'disliked';
}

const BUCKET_LABEL: Record<RatingBucket, string> = {
  disliked: 'Disliked',
  mixed: 'Mixed',
  liked: 'Liked',
};

const BUCKET_ICON_CLASS: Record<RatingBucket, string> = {
  disliked: 'text-destructive',
  mixed: 'text-muted-foreground',
  liked: 'text-foreground',
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
  // Mixed (4-6) renders no icon — keeps the visual quiet for the
  // ambiguous middle. Only the extremes get face-iconography.
  if (bucket === 'mixed') return null;
  const Icon = bucket === 'disliked' ? Frown : Smile;
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
