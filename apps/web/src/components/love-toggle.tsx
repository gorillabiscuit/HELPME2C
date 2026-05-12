'use client';

import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface LoveToggleProps {
  titleId: string;
  initialLoved: boolean;
  // Size variant — "sm" for inline list rows, "md" for prominent action.
  size?: 'sm' | 'md';
}

// Shared compact love toggle. Used in the library list (sm) and could be
// reused on other surfaces (rec cards have their own, larger button; this
// is for tighter rows). Server-driven: relies on router.refresh() to
// reflect the new state after mutation. No optimistic UI because the
// mutation is fast and the refresh is cheap.
export function LoveToggle({ titleId, initialLoved, size = 'sm' }: LoveToggleProps) {
  const router = useRouter();
  const setLoved = trpc.watch.setLoved.useMutation({
    onSuccess: () => router.refresh(),
  });

  const onClick = () => {
    setLoved.mutate({ titleId, loved: !initialLoved });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={setLoved.isPending}
      aria-pressed={initialLoved}
      aria-label={initialLoved ? 'Remove from your taste' : 'Add to your taste'}
      title={
        initialLoved
          ? "Remove from your taste — we won't weight this when recommending."
          : "Add to your taste — we'll recommend more like this."
      }
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        initialLoved
          ? 'text-foreground hover:bg-muted'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Heart
        className={cn(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', initialLoved ? 'fill-current' : '')}
        aria-hidden="true"
      />
    </button>
  );
}
