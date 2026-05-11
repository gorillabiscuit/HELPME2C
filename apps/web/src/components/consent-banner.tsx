'use client';

import { Button } from '@/components/ui/button';
import { useConsent } from '@/components/consent-provider';
import { consentDefaults } from '@/lib/consent';

export function ConsentBanner() {
  const { shouldShowBanner, setConsent, setPreferencesOpen } = useConsent();

  if (!shouldShowBanner) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white px-6 py-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-foreground">
          We use cookies for essential site functions, and — with your consent — for analytics and
          session replay so we can improve recommendations. See our{' '}
          <a href="/privacy" className="underline">
            privacy policy
          </a>
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setConsent(consentDefaults.rejectAll)}>
            Reject all
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreferencesOpen(true)}>
            Customise
          </Button>
          <Button size="sm" onClick={() => setConsent(consentDefaults.acceptAll)}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
