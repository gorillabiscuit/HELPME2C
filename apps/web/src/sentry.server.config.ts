import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Local-variable capture INTENTIONALLY DISABLED per ADR-0012 §2 "no
  // rejoin path" guarantee. With `includeLocalVariables: true`, any
  // server-side throw captures every local variable in the stack frame.
  // For the account-delete anonymisation path (apps/web/src/app/api/account/
  // delete/route.ts §anonymiseWatchSignals), a thrown error there would put
  // both `clerkId` (the original identifying user) AND `anonymousUserId`
  // (the random UUID linking their anonymised signals) in the same Sentry
  // event — creating an audit trail mapping user → anonymous data. That
  // defeats the entire ADR-0012 §2 anonymisation purpose.
  //
  // Lost debugging aid: Sentry won't show local variable values for
  // server-side errors. The exception type, message, and stack trace
  // still surface — usually enough to diagnose. If a specific class of
  // bug needs richer context, add per-error `Sentry.captureException(err,
  // { extra: { ... } })` with explicit, redacted fields rather than
  // re-enabling the blanket capture.
  includeLocalVariables: false,

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
