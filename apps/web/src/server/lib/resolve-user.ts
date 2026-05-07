import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { users } from '@/server/schema';

// Resolves a Clerk session userId (the public string id like 'user_3DOdSAKA…')
// → users.id (the internal uuid that watch_entries.user_id and
// user_recommendations.user_id reference).
//
// Inlined in each tRPC procedure that needs it rather than baked into
// protectedProcedure middleware: the lookup is a per-request DB hop, and
// procedures that work with clerkId directly (me.get / me.ensure) shouldn't
// pay for it.
//
// Returns null when the user has authenticated with Clerk but doesn't have
// a corresponding row in our `users` table yet (the brief race window after
// first signup, before me.ensure or the Clerk webhook lands the row).
// Callers handle the null case as appropriate — typically returning empty
// data for read paths, or throwing NOT_FOUND for write paths.
export async function resolveInternalUserId(
  database: typeof db,
  clerkId: string,
): Promise<string | null> {
  const [user] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return user?.id ?? null;
}
