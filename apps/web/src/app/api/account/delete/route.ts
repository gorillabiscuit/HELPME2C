import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { eq } from 'drizzle-orm';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { toIsoUtc } from '@helpme2c/shared';
import { db } from '@/server/db';
import { users } from '@/server/schema';

// POST /api/account/delete
//
// Article 17 (right to erasure) implementation per ADR-0012 §2.
// Synchronous: by the time this returns 200, the user is hard-deleted
// from our DB, from Clerk, and (best-effort) from PostHog. The 30-day
// GDPR ceiling is a backstop, not our target — we delete now.
//
// Hard-deletes (this commit):
//   1. The `users` row in our DB. ON DELETE CASCADE on every FK
//      pointing at users.id removes the user-attributable rows
//      automatically: watch_entries, user_recommendations,
//      user_streaming_providers, rec_feedback, group_memberships, owned
//      groups (which then cascade to their own memberships +
//      group_recommendations).
//   2. The Clerk user. Removes auth identity and invalidates all sessions
//      synchronously — the user's next request gets an UNAUTHORIZED from
//      Clerk middleware and is redirected to sign-in.
//   3. PostHog person profile via the PostHog Delete API, if
//      POSTHOG_PERSONAL_API_KEY is set. Best-effort — failures are logged
//      but don't gate the deletion since the DB is already gone and
//      PostHog stores opaque user IDs only (no email, no PII per
//      ADR-0012 §9).
//
// Sentry: nothing to do — per ADR-0012 §6, PII is redacted at ingest, so
// no user data exists in Sentry to delete.
//
// Future work (per ADR-0012 §2 moat-preservation framing — NOT a legal
// requirement): anonymise rather than hard-delete watch_entries +
// rec_feedback (NULL the user_id with a SET-NULL FK migration), keeping
// the rating signal for aggregate collaborative filtering. Hard-delete
// is GDPR-stricter so v1 ships with cascade. Tracked as a follow-up.
//
// Ordering: DB first, then Clerk, then PostHog. Each step is idempotent
// on retry — DB delete is a no-op on missing row, Clerk delete tolerates
// 404, PostHog delete tolerates anything.
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

  await deletePostHogPerson(userId);

  return NextResponse.json(
    {
      status: 'deleted',
      deletedAt: toIsoUtc(new Date()),
    },
    { status: 200 },
  );
}

// Best-effort PostHog person-profile deletion per ADR-0012 §2. Uses the
// PostHog Delete-Person API: DELETE /api/projects/{project_id}/persons/?distinct_id=<id>.
// The distinct_id is the Clerk user id (we identify with the opaque
// Clerk userId per ADR-0012 §9, never email).
//
// Failures are surfaced to Sentry rather than thrown — by the time we
// reach this step, the DB and Clerk identity are both gone. Letting a
// PostHog hiccup fail the request would leave the user staring at an
// error after their account is already deleted. A failed PostHog cleanup
// is recoverable manually via the PostHog dashboard if it ever matters.
async function deletePostHogPerson(distinctId: string): Promise<void> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com';

  if (!apiKey || !projectId) {
    // Env not configured — surface to Sentry so the gap is visible
    // without failing the deletion. Pre-launch this is OK; before
    // public marketing we should set both vars (ADR-0012 §2 requirement).
    Sentry.captureMessage(
      'account/delete: PostHog cleanup skipped — POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID not set',
      'warning',
    );
    return;
  }

  try {
    const url = `${host}/api/projects/${projectId}/persons/?distinct_id=${encodeURIComponent(distinctId)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    // 200 = deleted, 404 = no such person (also fine — they may have
    // had analytics opted out the whole time per the consent banner).
    if (!res.ok && res.status !== 404) {
      Sentry.captureMessage(
        `account/delete: PostHog cleanup non-OK ${res.status}: ${await res.text()}`,
        'warning',
      );
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { surface: 'account/delete', step: 'posthog-cleanup' } });
  }
}
