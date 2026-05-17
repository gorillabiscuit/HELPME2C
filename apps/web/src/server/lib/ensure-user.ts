import { db } from '@/server/db';
import { users } from '@/server/schema';

// Minimal shape both currentUser() (in request context) and the Clerk webhook
// event payload can be normalised into. Keeps the helper source-agnostic and
// independently testable without dragging in Clerk's full User type.
export interface ClerkUserSnapshot {
  id: string;
  firstName: string | null;
  lastName: string | null;
  publicMetadata: UserPublicMetadata;
}

// Idempotent upsert from a Clerk user snapshot to our `users` row.
// ON CONFLICT (clerk_id) DO UPDATE means concurrent callers (e.g. a slow
// me.ensure fallback racing the user.created webhook) cannot lose the row.
export async function ensureUserFromClerk(
  snapshot: ClerkUserSnapshot,
): Promise<typeof users.$inferSelect> {
  const displayName = [snapshot.firstName, snapshot.lastName].filter(Boolean).join(' ') || null;
  const region = snapshot.publicMetadata.region ?? 'eu';
  // ISO-3166-1 alpha-2 from age-check. undefined for users who haven't
  // re-verified post the country-addition rollout. Passed through as
  // undefined (not null) so Drizzle skips the column on insert/update
  // rather than clobbering an existing value with NULL.
  const country = snapshot.publicMetadata.country;
  const ageVerified = snapshot.publicMetadata.ageVerified ?? false;
  const ageVerifiedAt = snapshot.publicMetadata.ageVerifiedAt
    ? new Date(snapshot.publicMetadata.ageVerifiedAt)
    : null;

  const [row] = await db
    .insert(users)
    .values({
      clerkId: snapshot.id,
      displayName,
      region,
      country,
      ageVerified,
      ageVerifiedAt,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        displayName,
        region,
        // Only update country when the snapshot provides one — otherwise
        // a webhook firing for an unrelated user.updated event would clobber
        // a user-set country with NULL.
        ...(country !== undefined ? { country } : {}),
        ageVerified,
        ageVerifiedAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  // ON CONFLICT DO UPDATE always returns the row (winner or loser of any race),
  // so this should be unreachable. Throwing surfaces the invariant violation
  // explicitly instead of letting an `undefined` propagate downstream.
  if (!row) {
    throw new Error(`ensureUserFromClerk: upsert returned no row for clerkId=${snapshot.id}`);
  }
  return row;
}
