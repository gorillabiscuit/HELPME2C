import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/server/db';
import { users } from '@/server/schema';

// Server-side guard for protected pages that should only render for signed-in,
// age-verified users. Pages that need this call it at the top before fetching
// any user-specific data. Per ADR-0012 §5.
//
// Checks BOTH Clerk publicMetadata.ageVerified AND the DB row's age_verified
// column. This means wiping the DB resets the gate regardless of Clerk state —
// important for development resets and for defence-in-depth in production.
export async function requireAgeVerified() {
  const user = await currentUser();
  if (!user) {
    redirect('/');
  }

  // Fast path: Clerk metadata says not verified — no DB query needed.
  if (!user.publicMetadata?.ageVerified) {
    redirect('/age-check');
  }

  // Secondary check: DB row must exist and be verified.
  // Catches the case where the DB was wiped but Clerk metadata wasn't reset.
  const [dbUser] = await db
    .select({ ageVerified: users.ageVerified })
    .from(users)
    .where(eq(users.clerkId, user.id))
    .limit(1);

  if (!dbUser || !dbUser.ageVerified) {
    redirect('/age-check');
  }

  return user;
}
