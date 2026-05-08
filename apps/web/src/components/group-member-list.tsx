'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

interface Member {
  userId: string;
  displayName: string | null;
  role: 'owner' | 'member';
  isYou: boolean;
}

interface GroupMemberListProps {
  groupId: string;
  members: ReadonlyArray<Member>;
  isOwner: boolean;
}

export function GroupMemberList({ groupId, members, isOwner }: GroupMemberListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const remove = trpc.groups.removeMember.useMutation({
    onSuccess: () => {
      startTransition(() => router.refresh());
    },
  });
  const leave = trpc.groups.leave.useMutation({
    onSuccess: () => {
      // After leaving, the group page returns 404 for the caller — bounce
      // to /groups so they see the list (without this group).
      router.push('/groups');
    },
  });

  return (
    <ul className="space-y-2">
      {members.map((m) => {
        // Show: display name OR fallback short id, role badge, "you" badge,
        // and either a "Remove" button (if I'm owner and this isn't me) or
        // a "Leave" button (if it's me and I'm not owner).
        const showRemove = isOwner && !m.isYou;
        const showLeave = m.isYou && m.role !== 'owner';
        return (
          <li
            key={m.userId}
            className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-foreground">
                {m.displayName ?? `Member ${m.userId.slice(0, 6)}`}
              </span>
              {m.role === 'owner' ? (
                <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary-foreground">
                  Owner
                </span>
              ) : null}
              {m.isYou ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-body">
                  You
                </span>
              ) : null}
            </div>
            <div className="flex gap-1">
              {showRemove ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove.mutate({ groupId, userId: m.userId })}
                  disabled={remove.isPending}
                >
                  Remove
                </Button>
              ) : null}
              {showLeave ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => leave.mutate({ groupId })}
                  disabled={leave.isPending}
                >
                  Leave
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
