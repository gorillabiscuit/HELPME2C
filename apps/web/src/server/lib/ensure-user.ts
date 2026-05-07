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
      ageVerified,
      ageVerifiedAt,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        displayName,
        region,
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
