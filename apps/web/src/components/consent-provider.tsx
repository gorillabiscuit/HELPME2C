'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type ConsentRecord, readConsent, writeConsent } from '@/lib/consent';

interface ConsentContextValue {
  consent: ConsentRecord | null;
  // True when localStorage has been read (post-hydration) AND no record exists.
  // Banner reads this; analytics initializers in slice 5 will read `consent.categories.*`.
  shouldShowBanner: boolean;
  setConsent: (categories: { analytics: boolean; sessionReplay: boolean }) => void;
  preferencesOpen: boolean;
  setPreferencesOpen: (open: boolean) => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  // null on initial render so SSR + hydration match. Effect below loads from storage.
  const [consent, setConsentState] = useState<ConsentRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    setConsentState(readConsent());
    setHydrated(true);
  }, []);

  function setConsent(categories: { analytics: boolean; sessionReplay: boolean }) {
    const record = writeConsent(categories);
    setConsentState(record);
    setPreferencesOpen(false);
  }

  return (
    <ConsentContext.Provider
      value={{
        consent,
        shouldShowBanner: hydrated && consent === null,
        setConsent,
        preferencesOpen,
        setPreferencesOpen,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used inside <ConsentProvider>');
  return ctx;
}
