'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

interface GroupOwnerActionsProps {
  groupId: string;
}

export function GroupOwnerActions({ groupId }: GroupOwnerActionsProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const del = trpc.groups.delete.useMutation({
    onSuccess: () => {
      router.push('/groups');
    },
  });

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        className="text-muted-foreground hover:text-red-600"
      >
        Delete group
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-foreground">Delete this group? Cascades to members + recs.</span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => del.mutate({ id: groupId })}
        disabled={del.isPending}
      >
        {del.isPending ? 'Deleting…' : 'Yes, delete'}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
