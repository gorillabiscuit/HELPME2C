'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

// Minimal shape — declared inline rather than imported from @/server/* so the
// client bundle doesn't pull in server-side schema modules. The prop is the
// only field the button cares about for display.
interface InitialEntry {
  kind: 'anchor' | 'tracking';
  status: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch' | null;
}

interface TitleDetailAddButtonProps {
  titleId: string;
  initialEntry: InitialEntry | null;
}

const STATUS_LABEL: Record<NonNullable<InitialEntry['status']>, string> = {
  watching: 'Watching',
  completed: 'Completed',
  on_hold: 'On hold',
  dropped: 'Dropped',
  plan_to_watch: 'Plan to watch',
};

export function TitleDetailAddButton({ titleId, initialEntry }: TitleDetailAddButtonProps) {
  const router = useRouter();

  const upsertMutation = trpc.watch.upsert.useMutation({
    // Re-render the server component so the just-saved entry is reflected
    // (the page's initialEntry prop becomes the new row). Cheaper than
    // managing optimistic state and avoids drift if the mutation fails.
    onSuccess: () => router.refresh(),
  });

  if (initialEntry) {
    const label =
      initialEntry.kind === 'anchor'
        ? 'Anchor pick'
        : (initialEntry.status && STATUS_LABEL[initialEntry.status]) || 'On your list';
    return (
      <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
        On your list · {label}
      </span>
    );
  }

  return (
    <Button
      onClick={() => upsertMutation.mutate({ titleId, kind: 'tracking', status: 'plan_to_watch' })}
      disabled={upsertMutation.isPending}
    >
      {upsertMutation.isPending ? 'Adding…' : 'Add to list'}
    </Button>
  );
}
