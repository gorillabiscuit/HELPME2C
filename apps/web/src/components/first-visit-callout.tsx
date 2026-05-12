'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Dismissible explainer banner shown on the dashboard the first time a
// user lands there with real recs. Localstorage flag — once dismissed,
// never shown again on this device. The flag key is versioned so we can
// re-show a refreshed callout later by bumping the version.
//
// We don't try to coordinate the dismissed state across devices: a single
// "got it" on one device is enough. If a user genuinely wants the
// explainer back, they can clear site data.

const STORAGE_KEY = 'helpme2c.firstVisitCallout.v1';

export function FirstVisitCallout() {
  // Default to hidden so we don't flash the banner before localStorage
  // checks. Effect below flips it on if no dismissal recorded.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const onDismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="First visit explainer"
      className={cn(
        'mb-8 flex items-start gap-4 rounded-lg border border-primary/30 bg-primary/5 p-5',
      )}
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-foreground">Your first recommendations</h2>
        <p className="mt-1 text-sm text-text-body">
          These are based on the favourites you just picked. As you mark titles{' '}
          <strong>Watched it</strong>, hit <strong>Love this</strong> on shows you adore, or rate
          recs that hit or miss — we get sharper every time. There&apos;s no separate &ldquo;train
          the model&rdquo; step; everything you do here shapes what we suggest next.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex-none rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
