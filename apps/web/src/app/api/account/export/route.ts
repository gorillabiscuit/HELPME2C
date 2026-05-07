import { eq } from 'drizzle-orm';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/server/db';
import { users } from '@/server/schema';

// GET /api/account/export
//
// Combined Article 15 (right of access) + Article 20 (right to data
// portability) implementation per ADR-0012 §1.
//
// Returns all data we hold on the authenticated user as machine-readable
// JSON, served with `Content-Disposition: attachment` so browsers offer
// a download dialog.
//
// What's included today:
//   - The `users` table row from our DB (all fields)
//   - Clerk public user data: id, name, primary email, public_metadata,
//     timestamps
//
// What's deliberately NOT included:
//   - Clerk private_metadata — server-only by design (ADR-0012 §5).
//     The user can see their own *public* metadata but not server-only
//     fields the server uses internally.
//   - Session tokens — security risk (a leaked export would give session
//     access), no portability requirement covers them.
//   - Other users' data — obvious.
//
// What will be added when the schema grows (M3+):
//   - watch entries, ratings (per-user behavioural data)
//   - group memberships and group recommendations
//   - any other user-attributable rows we add
//
// Schema versioning: the response includes `schema: "helpme2c.account-export.v1"`
// so we can evolve the format without breaking downstream tools that
// might consume an export. Bump the version when we add or rename
// top-level keys.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const [dbRow] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);

  const exportData = {
    schema: 'helpme2c.account-export.v1',
    exportedAt: new Date().toISOString(),
    user: {
      our_database: dbRow ?? null,
      clerk: {
        id: clerkUser.id,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        primaryEmailAddress: clerkUser.primaryEmailAddress?.emailAddress ?? null,
        publicMetadata: clerkUser.publicMetadata,
        createdAt: new Date(clerkUser.createdAt).toISOString(),
        updatedAt: new Date(clerkUser.updatedAt).toISOString(),
      },
    },
  };

  const today = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="helpme2c-export-${today}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
