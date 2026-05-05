import { auth } from '@clerk/nextjs/server';
import { toIsoUtc } from '@helpme2c/shared';

// POST /api/account/delete
// Stub. Real deletion lands in M10 per ADR-0012 §2:
//   - Hard-delete user account, identifying links, sessions, third-party records
//     (Clerk user, Sentry user IDs, PostHog person profiles, Axiom log records)
//   - Anonymise behavioural signals (no rejoin path back to the user)
//   - Within 30 days of this request
// For Phase 1A M1: authenticate, log nothing (project logger lands in slice 5),
// return 202 Accepted so the contract exists.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  return new Response(
    JSON.stringify({
      status: 'accepted',
      message: 'Deletion requested. Real deletion logic lands in M10 per ADR-0012 §2.',
      userId,
      requestedAt: toIsoUtc(new Date()),
    }),
    {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
