import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { clerkClient } from '@clerk/nextjs/server';
import { ensureUserFromClerk } from '@/server/lib/ensure-user';

// Subset of Clerk's UserJSON we actually consume. Clerk's webhook payload uses
// snake_case (vs currentUser()'s camelCase User type), so we narrow here and
// normalise into the camelCase ClerkUserSnapshot at the call site below.
interface ClerkUserEventData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  public_metadata: UserPublicMetadata;
  private_metadata: UserPrivateMetadata;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserEventData;
  object: string;
  timestamp: number;
}

// POST /api/webhook/clerk — Clerk fires user.created and user.updated events
// here per the endpoint configured in Clerk Dashboard → Webhooks.
//
// Auth model: svix HMAC signature over the raw body. CLERK_WEBHOOK_SECRET is
// the shared secret. Without verification the endpoint would trust any caller
// since the URL is in Clerk's dashboard (publicly inspectable).
//
// Idempotency: ensureUserFromClerk uses ON CONFLICT DO UPDATE — Clerk retries
// on non-2xx responses are safe. updateUser({ privateMetadata }) is also
// idempotent.
//
// Failure mode: if the metadata update after upsert fails, the DB row is in
// sync but dbSynced stays false → home page keeps running the me.ensure
// fallback until the next webhook fires (or forever, if no further user
// updates happen). Acceptable for MVP — fallback is idempotent + cheap.
export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    // Misconfiguration — fail loud so the deploy logs surface it.
    return new Response('CLERK_WEBHOOK_SECRET not configured', { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // svix verifies the raw bytes, so we must NOT use req.json() here — that
  // would re-serialise and break the signature check.
  const rawBody = await req.text();

  const wh = new Webhook(secret);
  let evt: ClerkWebhookEvent;
  try {
    // svix's verify() returns `unknown` because it can't know the consumer's
    // schema. Cast to the Clerk webhook shape we documented above; runtime
    // validation of the event type happens immediately below.
    evt = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return new Response('Invalid signature', { status: 401 });
  }

  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    await ensureUserFromClerk({
      id: evt.data.id,
      firstName: evt.data.first_name,
      lastName: evt.data.last_name,
      publicMetadata: evt.data.public_metadata,
    });

    // Flip dbSynced so the home page can skip the me.ensure fallback on
    // subsequent renders. The session-token JWT picks up the new claim on
    // its next refresh (~60s), so there's a brief window where renders
    // still hit the fallback — fine, fallback is idempotent.
    const clerk = await clerkClient();
    await clerk.users.updateUser(evt.data.id, {
      privateMetadata: {
        ...evt.data.private_metadata,
        dbSynced: true,
      },
    });
  }

  // Unhandled event types (session.*, organization.*, etc.) get a 200 so
  // Clerk doesn't retry them indefinitely. We're only subscribed to user.*
  // today, but defending against future subscription drift.
  return new Response('ok', { status: 200 });
}
