import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { AgeCheckForm } from '@/components/age-check-form';

// /age-check is the post-signup gate. Server Component because:
//   - We need to check Clerk publicMetadata.ageVerified server-side to
//     bounce already-verified users forward to /onboarding (handles the
//     common "browser back button after completing the form" case;
//     bfcache restore is also defended against in the client form via
//     a pageshow listener that calls router.refresh).
//   - We need to read Vercel's x-vercel-ip-country header to pre-select
//     a sensible default country in the form. The Node runtime gets it
//     via the standard `headers()` API; no Edge runtime needed.
//
// Uses clerkClient.users.getUser() rather than currentUser() because the
// latter can read from a session-JWT snapshot whose publicMetadata lags
// behind direct updateUser writes — getUser hits Clerk's Backend API
// directly and returns post-write state.
export default async function AgeCheckPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/');
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (user.publicMetadata?.ageVerified) {
    // Already verified — don't re-show the form. Common case is browser
    // back from /onboarding; we forward them on instead of forcing a
    // re-submit of a birth date they've already declared.
    redirect('/onboarding');
  }

  const h = await headers();
  const ipCountry = h.get('x-vercel-ip-country');
  // Vercel returns uppercase ISO-3166-1 alpha-2 already, but normalise
  // defensively in case the header value comes from a different source.
  const initialCountry = ipCountry?.toUpperCase() ?? null;
  return <AgeCheckForm initialCountry={initialCountry} />;
}
