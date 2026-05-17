// Dev-only: reset a single user's data so they re-experience cold-start
// onboarding without going through delete-account + recreate. Keeps the
// users row intact (Clerk identity, ageVerified, region, prefs) — only
// wipes user-data tables filtered by user_id.
//
// After running, the user's next visit routes /onboarding (because
// hasAnyRating becomes false in apps/web/src/app/onboarding/page.tsx).
//
// Invoke via:
//   RESET_OK=yes pnpm dlx tsx --env-file=.env.local \
//     scripts/reset-user.ts --clerk-id=user_XXXXXXXXXXXXXXXXXXXX
//
// Or by email (looks up the clerk_id via Clerk's admin API):
//   RESET_OK=yes pnpm dlx tsx --env-file=.env.local \
//     scripts/reset-user.ts --email=you@example.com
//
// Add --clear-age-verified to ALSO clear ageVerified in Clerk
// publicMetadata + the users row, so the next browser visit lands on
// /age-check instead of skipping ahead to /onboarding:
//   RESET_OK=yes pnpm dlx tsx --env-file=.env.local \
//     scripts/reset-user.ts --email=you@example.com --clear-age-verified
//
// Refuses to run without RESET_OK=yes so it can't fire by accident.
// Modelled on scripts/db-wipe.ts; same FK-cascade reasoning as
// apps/web/src/app/api/account/delete/route.ts.
import { neon } from '@neondatabase/serverless';

interface UserRow {
  id: string;
  clerk_id: string;
  age_verified: boolean;
}

interface ClerkUser {
  id: string;
}

function getFlag(name: string): string | undefined {
  // Support both `--flag=value` and `--flag value` styles.
  for (const arg of process.argv) {
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
  }
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function resolveClerkIdFromEmail(email: string): Promise<string> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error(
      'CLERK_SECRET_KEY not set. Email lookup requires Clerk admin access. ' +
        'Pull fresh env (`vercel env pull .env.local` from apps/web) or pass ' +
        '--clerk-id instead.',
    );
    process.exit(1);
  }

  // Direct REST call avoids pulling Clerk SDK into the script (transitive
  // only via @clerk/nextjs, not safe to import directly from a Node script
  // context). The endpoint is documented at
  // https://clerk.com/docs/reference/backend-api/tag/Users#operation/GetUserList
  const url = `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=10`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!res.ok) {
    console.error(`Clerk lookup failed: ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }
  const matches = (await res.json()) as ClerkUser[];

  if (matches.length === 0) {
    console.error(`No Clerk user found with email = ${email}. Nothing to reset.`);
    // Exit 0 — "no such user" is idempotent for a reset operation.
    process.exit(0);
  }
  if (matches.length > 1) {
    console.error(
      `Email ${email} matches ${matches.length} Clerk users. Disambiguate by ` +
        `passing --clerk-id directly. Candidates: ${matches.map((u) => u.id).join(', ')}`,
    );
    process.exit(1);
  }
  return matches[0].id;
}

async function clearClerkAgeVerified(clerkId: string): Promise<void> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error(
      'CLERK_SECRET_KEY not set. --clear-age-verified requires Clerk admin ' +
        'access. Pull fresh env (`vercel env pull .env.local` from apps/web).',
    );
    process.exit(1);
  }

  // PATCH user metadata. Clerk's metadata endpoint merges by replacing
  // each provided top-level key, so explicitly setting age fields to
  // null/false unwinds them. We also clear country here — the age-check
  // flow rewrites it on next verify, and leaving the stale value would
  // confuse the user testing the picker default behaviour. region stays
  // as-is (not relevant to the age gate's redirect logic).
  const res = await fetch(`https://api.clerk.com/v1/users/${clerkId}/metadata`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_metadata: {
        ageVerified: false,
        ageVerifiedAt: null,
        country: null,
      },
    }),
  });
  if (!res.ok) {
    console.error(`Clerk metadata PATCH failed: ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }
}

async function main(): Promise<void> {
  if (process.env.RESET_OK !== 'yes') {
    console.error(
      'Refusing to run without RESET_OK=yes. This script deletes every ' +
        'user-data row for the given clerk-id (or email-resolved clerk-id). ' +
        'Set RESET_OK=yes in the invocation if you really want to reset.',
    );
    process.exit(1);
  }

  const clerkIdArg = getFlag('--clerk-id');
  const emailArg = getFlag('--email');
  const clearAgeVerified = process.argv.includes('--clear-age-verified');
  if (!clerkIdArg && !emailArg) {
    console.error('Usage: --clerk-id=user_XXXXXXXXXXXXXXXXXXXX OR --email=you@example.com');
    console.error('Optional: --clear-age-verified (also clears Clerk publicMetadata.ageVerified)');
    process.exit(1);
  }
  if (clerkIdArg && emailArg) {
    console.error('Pass either --clerk-id or --email, not both.');
    process.exit(1);
  }

  const clerkId = clerkIdArg ?? (await resolveClerkIdFromEmail(emailArg!));

  const sql = neon(process.env.DATABASE_URL!);

  const userRows = (await sql`
    SELECT id, clerk_id, age_verified
    FROM users
    WHERE clerk_id = ${clerkId}
    LIMIT 1
  `) as UserRow[];
  if (userRows.length === 0) {
    // For email lookups this is meaningfully different from "Clerk user
    // doesn't exist" — the Clerk user might exist but never finished
    // signup (no DB row created). Exit 0 either way; nothing to wipe.
    console.error(
      `No DB row found for clerk_id = ${clerkId}` +
        (emailArg ? ` (resolved from email ${emailArg})` : '') +
        '. Nothing to reset.',
    );
    process.exit(0);
  }
  const userRow = userRows[0];
  const userId = userRow.id;

  console.log(
    `Resetting user_id=${userId} (clerk_id=${clerkId}` +
      (emailArg ? `, email=${emailArg}` : '') +
      `, age_verified=${userRow.age_verified}). ` +
      (clearAgeVerified
        ? 'Users row + Clerk identity preserved; ageVerified WILL be cleared.'
        : 'Users row + Clerk identity + ageVerified are preserved.'),
  );

  // FK-safe deletion order. The two non-trivial bits:
  //   1. group_memberships before groups — leave any groups you're in
  //      before deleting groups you own (CASCADE on owned groups would
  //      handle this, but explicit is safer).
  //   2. groups DELETE here is for groups Wouter OWNS — that CASCADEs
  //      to memberships of OTHER users and group_recommendations for
  //      those groups. For a dev reset on your own account, this is
  //      fine; if you owned a real shared group with other testers,
  //      those memberships would also go. That's the intended scope of
  //      "reset MY data".
  await sql`DELETE FROM pairwise_comparisons WHERE user_id = ${userId}`;
  await sql`DELETE FROM rec_feedback WHERE user_id = ${userId}`;
  await sql`DELETE FROM user_recommendations WHERE user_id = ${userId}`;
  await sql`DELETE FROM group_memberships WHERE user_id = ${userId}`;
  await sql`DELETE FROM groups WHERE owner_id = ${userId}`;
  await sql`DELETE FROM user_streaming_providers WHERE user_id = ${userId}`;
  await sql`DELETE FROM watch_entries WHERE user_id = ${userId}`;

  if (clearAgeVerified) {
    // Clerk publicMetadata is the source of truth (the /age-check page
    // reads it via clerkClient.users.getUser to decide whether to
    // redirect to /onboarding). The DB columns are synced from there
    // via the Clerk webhook, but we clear them in the same transaction
    // here so the next page render sees consistent state immediately
    // instead of waiting for the webhook race.
    await clearClerkAgeVerified(clerkId);
    await sql`
      UPDATE users
      SET age_verified = false,
          age_verified_at = NULL,
          country = NULL
      WHERE id = ${userId}
    `;
    console.log('Cleared ageVerified in Clerk publicMetadata + users row.');
  }

  const counts = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM watch_entries           WHERE user_id  = ${userId}) AS watch_entries,
      (SELECT COUNT(*)::int FROM rec_feedback            WHERE user_id  = ${userId}) AS rec_feedback,
      (SELECT COUNT(*)::int FROM user_recommendations    WHERE user_id  = ${userId}) AS user_recommendations,
      (SELECT COUNT(*)::int FROM user_streaming_providers WHERE user_id = ${userId}) AS user_streaming_providers,
      (SELECT COUNT(*)::int FROM group_memberships       WHERE user_id  = ${userId}) AS group_memberships,
      (SELECT COUNT(*)::int FROM groups                  WHERE owner_id = ${userId}) AS groups_owned,
      (SELECT COUNT(*)::int FROM pairwise_comparisons    WHERE user_id  = ${userId}) AS pairwise_comparisons,
      (SELECT COUNT(*)::int FROM users                   WHERE id       = ${userId}) AS user_row_kept
  `;

  console.log(
    'Post-reset row counts (all per-user tables should be 0; user_row_kept should be 1):',
  );
  console.log(JSON.stringify(counts[0], null, 2));
  console.log(
    clearAgeVerified
      ? 'Next browser visit will route through /age-check (then /onboarding intro).'
      : 'Next browser visit will route through /onboarding intro screen.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
