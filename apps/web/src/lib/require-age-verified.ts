import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';

// Server-side guard for protected pages that should only render for signed-in,
// age-verified users. Pages that need this call it at the top before fetching
// any user-specific data. Per ADR-0012 §5.
export async function requireAgeVerified() {
  const user = await currentUser();
  if (!user) {
    // Middleware (proxy.ts) already redirects unauthed users to Clerk's hosted
    // sign-in for protected routes; this branch is a defence-in-depth fallback.
    redirect('/');
  }
  if (!user.publicMetadata?.ageVerified) {
    redirect('/age-check');
  }
  return user;
}
