import * as Sentry from '@sentry/nextjs';

// Edge runtime is used by Next.js middleware (proxy.ts) for Clerk auth checks per ADR-0015.
// Application code stays on the Node.js runtime per ADR-0017's lock-in firewall.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  beforeSend(event) {
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
