'use client';

import { useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CONFIRM_PHRASE = 'delete my account';

// Type-to-confirm flow per common UX best practice for destructive
// actions. The phrase is "delete my account" so it can't be typed by
// muscle memory.
//
// Flow on submit:
//   1. POST /api/account/delete — DB row + Clerk user gone, PostHog
//      person profile deletion fired in the route
//   2. Sign out client-side via Clerk to invalidate the local session
//      cookie immediately (the Clerk delete already invalidates server-
//      side, but the cookie persists until a new request validates)
//   3. Redirect to /
export function AccountDeleteForm() {
  const { signOut } = useClerk();
  const [confirmText, setConfirmText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Delete failed (${res.status})`);
      }
      // Clear local Clerk session and redirect to the marketing home.
      // signOut accepts a redirectUrl; even if it doesn't fire (Clerk
      // might 401 since the user is gone), the manual reload below
      // ensures we don't linger on the now-invalid page.
      await signOut({ redirectUrl: '/' });
      // Belt-and-braces: hard navigate in case the SDK doesn't redirect.
      window.location.href = '/';
    } catch (e) {
      setPending(false);
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const phraseMatches = confirmText.trim().toLowerCase() === CONFIRM_PHRASE;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="delete-confirm">
          Type <span className="font-mono text-red-700">{CONFIRM_PHRASE}</span> to confirm
        </Label>
        <Input
          id="delete-confirm"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <Button
        type="button"
        variant="destructive"
        onClick={onDelete}
        disabled={!phraseMatches || pending}
      >
        {pending ? 'Deleting…' : 'Delete my account'}
      </Button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
