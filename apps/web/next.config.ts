import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  images: {
    // Allowlist for next/image remote sources. Without an entry here,
    // next/image refuses to optimise the URL and renders a broken
    // thumbnail. TMDB serves TV posters; AniList serves anime posters
    // and banner images.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
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
