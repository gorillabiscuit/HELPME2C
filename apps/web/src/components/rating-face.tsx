import { Heart, ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// Maps a numeric rating to a display bucket for the 3-point scale:
//   < 7   → didn't like (ThumbsDown)
//   7–9   → liked (ThumbsUp)
//   10    → loved (Heart)
// The 1-10 scale is retained internally for recommendation scoring;
// this component handles display only.

export type RatingBucket = 'disliked' | 'liked' | 'loved';

export function bucketForRating(rating: number): RatingBucket {
  if (rating >= 10) return 'loved';
  if (rating >= 7) return 'liked';
  return 'disliked';
}

const BUCKET_LABEL: Record<RatingBucket, string> = {
  disliked: "Didn't like it",
  liked: 'Liked it',
  loved: 'Loved it',
};

const BUCKET_ICON_CLASS: Record<RatingBucket, string> = {
  disliked: 'text-destructive',
  liked: 'text-foreground',
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
  const Icon = bucket === 'disliked' ? ThumbsDown : bucket === 'liked' ? ThumbsUp : Heart;
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
