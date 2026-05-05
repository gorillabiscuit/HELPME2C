import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  // Source map upload deferred to production deploy. Set SENTRY_AUTH_TOKEN +
  // SENTRY_ORG + SENTRY_PROJECT in CI/Vercel env to enable; the plugin silently
  // skips upload when the token is absent (fine for local dev).
  silent: !process.env.CI,
});
