'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

interface GroupInviteShareProps {
  groupId: string;
  initialUrl: string;
}

// Owner-only invite-link surface. Renders the current URL with a
// copy-to-clipboard button and a rotate button (invalidates the old
// link). After rotation, the new URL is shown immediately + the page
// is refreshed so the server-rendered URL stays in sync.
export function GroupInviteShare({ groupId, initialUrl }: GroupInviteShareProps) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const rotate = trpc.groups.rotateInvite.useMutation({
    onSuccess: ({ inviteToken }) => {
      // Build the new URL using the same host as the initial URL — the
      // path is the only thing that changes.
      const base = initialUrl.split('/groups/join/')[0];
      setUrl(`${base}/groups/join/${inviteToken}`);
      startTransition(() => router.refresh());
    },
  });

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail under non-https or restricted contexts.
      // Fall back to selecting the input so the user can copy manually.
      // `as HTMLInputElement | null` because getElementById's return type
      // is the broader `HTMLElement | null` — we know our id targets an
      // <input>, but TS can't see the JSX → DOM correspondence.
      const input = document.getElementById('group-invite-url') as HTMLInputElement | null;
      input?.select();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-body">
        Share this link with someone you want to add. Anyone with the link can join.
      </p>
      <div className="flex gap-2">
        <input
          id="group-invite-url"
          readOnly
          value={url}
          className="flex-1 rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground outline-none"
          // `as HTMLInputElement` — onClick's `e.target` is typed as
          // EventTarget; we know it's the <input> we attached to.
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <Button type="button" variant="outline" onClick={onCopy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => rotate.mutate({ id: groupId })}
          disabled={rotate.isPending}
          title="Generate a new link and invalidate the old one"
        >
          {rotate.isPending ? 'Rotating…' : 'Rotate'}
        </Button>
      </div>
    </div>
  );
}
