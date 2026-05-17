// Extends Clerk's UserPublicMetadata for type-safe metadata access.
// Per ADR-0012 §5: age gate stores only the fact of verification + timestamp +
// region. The actual birth date is not stored — the legal shield is the
// documented declaration at the moment of verification, not the date itself.
declare global {
  interface UserPublicMetadata {
    ageVerified?: boolean;
    ageVerifiedAt?: string; // ISO-8601 UTC
    region?: 'eu' | 'row';
    // ISO-3166-1 alpha-2 country code, captured at age-check, IP-defaulted
    // via Vercel's x-vercel-ip-country header. Optional during the
    // transition — existing users have no country set until they re-verify
    // or until the Phase 1B backfill ticket lands. Source of truth for
    // streaming-availability filtering (TMDB watch_region takes country,
    // not the eu/row split) and for the future drop-region migration.
    country?: string;
    // Written by the Clerk user.created/user.updated webhook handler after a
    // successful upsert into the `users` table. Read by the home page via the
    // `publicMetadata` session-token claim to short-circuit the me.ensure
    // fallback once the DB row is known to be in sync.
    //
    // Lives in public_metadata (not private_metadata) because Clerk's
    // session-token customisation projects whole metadata objects into the JWT,
    // and anything projected into the JWT is client-readable. "private" was
    // misleading once that projection happens; dbSynced is not sensitive.
    dbSynced?: boolean;
  }

  // Custom JWT claims projected from the Clerk Dashboard session-token
  // customisation. The mapping `{ "publicMetadata": "{{user.public_metadata}}" }`
  // copies the whole public_metadata object into the session token. Clerk's
  // shortcode resolver only supports top-level paths, hence projecting the
  // whole object instead of individual fields like `dbSynced`.
  interface CustomJwtSessionClaims {
    publicMetadata?: UserPublicMetadata;
  }
}

export {};
