'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

interface LibraryRemoveButtonProps {
  titleId: string;
  titleText: string;
}

export function LibraryRemoveButton({ titleId, titleText }: LibraryRemoveButtonProps) {
  const router = useRouter();

  const removeMutation = trpc.watch.remove.useMutation({
    // Server component re-renders with one fewer entry. Same pattern as
    // the title-detail Add button — cheaper than optimistic state, no
    // drift if the mutation fails.
    onSuccess: () => router.refresh(),
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={removeMutation.isPending}
      onClick={() => {
        // Browser confirm — light friction, no extra UI commitment.
        // Replace with a shadcn AlertDialog when M9 polish lands.
        if (window.confirm(`Remove "${titleText}" from your list?`)) {
          removeMutation.mutate({ titleId });
        }
      }}
    >
      {removeMutation.isPending ? 'Removing…' : 'Remove'}
    </Button>
  );
}
