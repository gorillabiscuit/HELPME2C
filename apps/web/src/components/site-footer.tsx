'use client';

import { useConsent } from '@/components/consent-provider';

export function SiteFooter() {
  const { setPreferencesOpen } = useConsent();

  return (
    <footer className="mt-16 border-t border-border px-6 py-6 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 md:flex-row">
        <span>&copy; {new Date().getFullYear()} HelpME2C</span>
        <div className="flex gap-4">
          <a href="/privacy" className="hover:text-foreground">
            Privacy
          </a>
          <button
            type="button"
            onClick={() => setPreferencesOpen(true)}
            className="hover:text-foreground"
          >
            Cookie preferences
          </button>
        </div>
      </div>
    </footer>
  );
}
