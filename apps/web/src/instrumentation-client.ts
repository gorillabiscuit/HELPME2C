import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // PII redaction per ADR-0012 §9 — don't auto-attach IP, headers, or cookies.
  // The `beforeSend` hook below is belt-and-suspenders against any attached identifiers.
  sendDefaultPii: false,

  // 100% in dev for visibility, 10% in production to control event volume.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // No `replayIntegration` — PostHog handles session replay per ADR-0010.

  beforeSend(event) {
    // Strip user-identifying data per ADR-0012 §9. User IDs are kept (legitimate
    // for error debugging); email, name, IP, cookies, headers all go.
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
