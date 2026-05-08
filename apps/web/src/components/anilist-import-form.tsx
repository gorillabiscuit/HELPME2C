'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AnilistImportForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [, startTransition] = useTransition();

  const importMutation = trpc.listImport.fromAnilist.useMutation({
    onSuccess: () => {
      // Refresh server components so the dashboard's recs reflect the
      // new ratings (the recompute event is fired server-side).
      startTransition(() => router.refresh());
    },
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length === 0) return;
    importMutation.mutate({ username: trimmed });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="anilist-username">AniList username</Label>
        <Input
          id="anilist-username"
          placeholder="e.g. yourusername"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={40}
          autoComplete="off"
        />
      </div>
      <Button type="submit" disabled={importMutation.isPending || username.trim().length === 0}>
        {importMutation.isPending ? 'Importing…' : 'Import from AniList'}
      </Button>

      {importMutation.isSuccess ? (
        <p className="text-sm text-emerald-700">
          Imported {importMutation.data.imported} of {importMutation.data.total} titles.
          {importMutation.data.skipped > 0
            ? ` Skipped ${importMutation.data.skipped} not in our catalogue.`
            : ''}
        </p>
      ) : null}
      {importMutation.isError ? (
        <p className="text-sm text-red-700">{importMutation.error.message}</p>
      ) : null}
    </form>
  );
}
