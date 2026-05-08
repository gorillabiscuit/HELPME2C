import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { eq, sql } from 'drizzle-orm';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { toIsoUtc } from '@helpme2c/shared';
import { db } from '@/server/db';
import { anonymousWatchSignals, users, watchEntries } from '@/server/schema';

// POST /api/account/delete
//
// Article 17 (right to erasure) implementation per ADR-0012 §1+§2.
// Synchronous: by the time this returns 200, identifying data is gone
// from our DB, from Clerk, and (best-effort) from PostHog. The 30-day
// GDPR ceiling is a backstop, not our target — we delete now.
//
// Two-stage deletion per ADR-0012 §2:
//
//   Stage 1 — anonymise behavioural signal (BEFORE the cascade fires):
//     COPY each watch_entries row into anonymous_watch_signals with a
//     random per-deletion UUID as anonymous_user_id. The UUID is
//     generated server-side and never stored anywhere else, so the
//     copied rows preserve "these N entries came from the same person"
//     (useful for collaborative-filtering co-occurrence) but have no
//     rejoin path back to the original user. ADR-0012 §2: "Once the
//     deletion job runs, the data is unlinkable."
//
//   Stage 2 — hard-delete the identifying data:
//     1. The `users` row in our DB. ON DELETE CASCADE on every FK
//        pointing at users.id removes the user-attributable rows
//        automatically: watch_entries (now anonymised above),
//        user_recommendations, user_streaming_providers, rec_feedback,
//        group_memberships, owned groups (which cascade to their
//        memberships + group_recommendations).
//     2. The Clerk user. Removes auth identity and invalidates all
//        sessions synchronously — the user's next request gets an
//        UNAUTHORIZED from Clerk middleware and is redirected to sign-in.
//     3. PostHog person profile via the PostHog Delete API, if
//        POSTHOG_PERSONAL_API_KEY is set. Best-effort — failures
//        captured to Sentry but don't gate the deletion since the DB
//        is already gone and PostHog stores opaque user IDs only (no
//        email, no PII per ADR-0012 §9).
//
// Sentry: nothing to do — per ADR-0012 §6, PII is redacted at ingest,
// so no user data exists in Sentry to delete.
//
// Future work: extend anonymisation to rec_feedback (rating signal
// once the tuning consumer ships) — same pattern, additive table.
//
// Retry semantics: all stages idempotent on retry (with one acceptable
// quirk — see anonymiseWatchSignals). DB delete is a no-op on missing
// row, Clerk delete tolerates 404, PostHog delete tolerates anything.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Stage 1 — copy behavioural signal to the anonymous table BEFORE
  // the cascade kills the originals. Resolves clerkId → internal uuid.
  // Best-effort: if this fails, we still proceed to delete identifying
  // data (the legal obligation). Anonymisation is moat-preservation,
  // not GDPR.
  await anonymiseWatchSignals(userId);

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

// Behavioural-signal anonymisation per ADR-0012 §2 (moat-preservation
// half). Generates a random UUID server-side, copies every watch_entries
// row for this user into anonymous_watch_signals tagged with that UUID,
// then returns. The UUID is the link between this user's anonymised
// signals — useful for future collaborative-filtering co-occurrence
// queries — but is never stored anywhere else, so there's no rejoin
// path back to the user.
//
// Failure mode: if this throws, the caller proceeds to delete identifying
// data anyway (the legal obligation). Anonymisation is preservation
// of optional product signal, not GDPR. Errors captured to Sentry.
//
// Retry quirk: COPY-then-DELETE in two statements (the Neon HTTP driver
// doesn't support transactions). If a retry happens after COPY succeeded
// but before the user-row delete fired, a second COPY would land — but
// under a *new* random anonymous_user_id, so the deletion looks like
// "two anonymous people each watched this set" rather than one person
// twice. The duplicated signal slightly inflates that user's contribution
// to aggregate signal, no PII risk. Acceptable for v1.
async function anonymiseWatchSignals(clerkId: string): Promise<void> {
  try {
    const [userRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);
    if (!userRow) return; // No DB row → nothing to anonymise.

    const anonymousUserId = randomUUID();

    // INSERT … SELECT — single SQL statement so the COPY itself is atomic.
    // Drizzle's query builder doesn't expose INSERT-FROM-SELECT cleanly,
    // so use the raw `sql` template tag with parameterised values.
    await db.execute(sql`
      INSERT INTO ${anonymousWatchSignals}
        (anonymous_user_id, title_id, kind, status, rating, current_episode,
         original_created_at, original_updated_at)
      SELECT
        ${anonymousUserId}::uuid,
        ${watchEntries.titleId},
        ${watchEntries.kind},
        ${watchEntries.status},
        ${watchEntries.rating},
        ${watchEntries.currentEpisode},
        ${watchEntries.createdAt},
        ${watchEntries.updatedAt}
      FROM ${watchEntries}
      WHERE ${watchEntries.userId} = ${userRow.id}
    `);
  } catch (err) {
    // Anonymisation failure does NOT block the deletion — the GDPR
    // obligation is to remove identifying data, which proceeds below.
    Sentry.captureException(err, {
      tags: { surface: 'account/delete', step: 'anonymise-watch-signals' },
    });
  }
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
