import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  images: {
    // Allowlist for next/image remote sources. TMDB serves all our poster
    // and backdrop URLs; without this, next/image refuses to optimise them
    // and the title detail page renders broken thumbnails.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Source map upload deferred to production deploy. Set SENTRY_AUTH_TOKEN +
  // SENTRY_ORG + SENTRY_PROJECT in CI/Vercel env to enable; the plugin silently
  // skips upload when the token is absent (fine for local dev).
  silent: !process.env.CI,
});
