'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useConsent } from '@/components/consent-provider';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com';

// Initialize once at module load with capture opted out by default. The
// PostHogProvider below flips opt-in/opt-out + session-recording state based on
// the consent toggles from ConsentProvider per ADR-0012 §4.
//
// Pragmatic trade: posthog-js still ships in the bundle for non-consenting
// users (~50KB gzipped). A stricter GDPR posture would dynamic-import after
// consent so the script doesn't load at all pre-consent — flagged for M11
// launch-readiness polish, not slice 5b.
if (typeof window !== 'undefined' && POSTHOG_KEY && !posthog.__loaded) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,

    // ADR-0012 §9: don't auto-create person profiles for anonymous sessions.
    // When we identify (post-Clerk-signin, separate slice), use Clerk's
    // opaque userId, never email.
    person_profiles: 'identified_only',

    // ADR-0012 §4: capture is opt-out by default until consent flips it on.
    opt_out_capturing_by_default: true,

    // ADR-0012 §9 strict masking — everything masked unless explicitly allowed.
    mask_all_text: true,
    mask_all_element_attributes: true,

    // Session replay starts disabled; enabled at runtime when both analytics
    // AND sessionReplay consent are true. Masking config inside session_recording
    // is a safety net for when it does start.
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
    },

    debug: process.env.NODE_ENV === 'development',
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useConsent();
  const analyticsConsent = consent?.categories.analytics ?? false;
  const replayConsent = consent?.categories.sessionReplay ?? false;

  // Toggle event capture based on the analytics consent category.
  useEffect(() => {
    if (typeof window === 'undefined' || !posthog.__loaded) return;
    if (analyticsConsent) {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }
  }, [analyticsConsent]);

  // Session replay requires BOTH analytics and replay consent.
  // Revoking either stops recording; replay is the more invasive surface.
  useEffect(() => {
    if (typeof window === 'undefined' || !posthog.__loaded) return;
    if (analyticsConsent && replayConsent) {
      posthog.startSessionRecording();
    } else {
      posthog.stopSessionRecording();
    }
  }, [analyticsConsent, replayConsent]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
