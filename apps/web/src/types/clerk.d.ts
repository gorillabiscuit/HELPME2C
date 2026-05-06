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
}

export {};
