// Extends Clerk's UserPublicMetadata for type-safe metadata access.
// Per ADR-0012 §5: age gate stores only the fact of verification + timestamp +
// region. The actual birth date is not stored — the legal shield is the
// documented declaration at the moment of verification, not the date itself.
declare global {
  interface UserPublicMetadata {
    ageVerified?: boolean;
    ageVerifiedAt?: string; // ISO-8601 UTC
    region?: 'eu' | 'row';
  }

  // Server-only: written by the Clerk user.created/user.updated webhook handler
  // after a successful upsert into the `users` table. Read by the home page's
  // server component via the `dbSynced` session-token claim (configured in Clerk
  // Dashboard → Sessions → Customize session token) to short-circuit the
  // me.ensure fallback once the DB row is known to be in sync.
  // Not exposed to the client — `private_metadata` is server-only by design.
  interface UserPrivateMetadata {
    dbSynced?: boolean;
  }

  // Custom JWT claims projected from `private_metadata` via the Clerk Dashboard
  // session-token customisation. Read via `auth().sessionClaims?.dbSynced`.
  interface CustomJwtSessionClaims {
    dbSynced?: boolean;
  }
}

export {};
