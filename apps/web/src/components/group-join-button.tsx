'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

export function GroupJoinButton({ token }: { token: string }) {
  const router = useRouter();
  const join = trpc.groups.join.useMutation({
    onSuccess: ({ groupId }) => {
      router.push(`/groups/${groupId}`);
    },
  });

  return (
    <Button onClick={() => join.mutate({ token })} disabled={join.isPending}>
      {join.isPending ? 'Joining…' : 'Join group'}
    </Button>
  );
}
