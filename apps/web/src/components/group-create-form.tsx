'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function GroupCreateForm() {
  const router = useRouter();
  const [name, setName] = useState('');

  const create = trpc.groups.create.useMutation({
    onSuccess: ({ id }) => {
      router.push(`/groups/${id}`);
    },
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    create.mutate({ name: trimmed });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="group-name">Name</Label>
        <Input
          id="group-name"
          placeholder="e.g. Sunday couch crew"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
      </div>
      <Button type="submit" disabled={create.isPending || name.trim().length === 0}>
        {create.isPending ? 'Creating…' : 'Create'}
      </Button>
    </form>
  );
}
