import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { toIsoUtc } from '@helpme2c/shared';
import { db } from '@/server/db';
import { users } from '@/server/schema';

// POST /api/account/delete
//
// Article 17 (right to erasure) implementation per ADR-0012 §2.
// Synchronous: by the time this returns 200, the user is hard-deleted
// from our DB and from Clerk. The 30-day GDPR ceiling is a backstop, not
// our target — we delete now.
//
// Hard-deletes (this commit):
//   1. The `users` row in our DB. Cascade-deletes user-owned rows in
//      `title_tags`, `streaming_availability` (none reference users today;
//      cascade pattern lands when watchlist/rating tables ship in M3).
//   2. The Clerk user. Removes auth identity and invalidates all sessions
//      synchronously — the user's next request gets an UNAUTHORIZED from
//      Clerk middleware and is redirected to sign-in.
//
// Sentry: nothing to do — per ADR-0012 §6, PII is redacted at ingest, so
// no user data exists in Sentry to delete.
//
// TODO before alpha launch:
//   - PostHog person-profile deletion via PostHog Delete API. Needs a
//     POSTHOG_PERSONAL_API_KEY env var (different from the public capture
//     token we already have). ADR-0012 §2 lists this as in-scope.
//   - Once watchlist / rating / group tables exist (M3+), anonymise their
//     behavioural-signal rows per ADR-0012 §2 — NULL the user FK, keep
//     the row so aggregate signal survives. The "anonymise behavioural
//     signal" branch is what makes the rec-engine moat survive churn.
//
// Ordering: DB first, then Clerk. If the DB delete fails, the user is
// still authenticated and can retry. If Clerk's delete fails after our
// DB delete succeeded, the row is gone but the auth identity remains —
// retry is idempotent (DB delete is a no-op on the second call). The
// reverse ordering would orphan a row if Clerk succeeded but our DB
// failed.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  await db.delete(users).where(eq(users.clerkId, userId));

  const clerk = await clerkClient();
  try {
    await clerk.users.deleteUser(userId);
  } catch (err) {
    // Tolerate "user already deleted in Clerk" — retry-safe. Same shape
    // as the webhook 404 tolerance (apps/web/src/app/api/webhook/clerk/route.ts).
    const isClerkNotFound =
      err !== null &&
      typeof err === 'object' &&
      'status' in err &&
      err.status === 404 &&
      'clerkError' in err;
    if (!isClerkNotFound) {
      throw err;
    }
  }

  return NextResponse.json(
    {
      status: 'deleted',
      deletedAt: toIsoUtc(new Date()),
    },
    { status: 200 },
  );
}
