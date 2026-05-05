// Versioned localStorage key — bump if the schema evolves and a migration is needed.
const STORAGE_KEY = 'helpme2c.consent.v1';
const SCHEMA_VERSION = 1 as const;

export interface ConsentRecord {
  version: typeof SCHEMA_VERSION;
  // ISO-8601 UTC with Z suffix per CLAUDE.md §2.
  timestamp: string;
  categories: {
    // Strictly necessary — auth, security, session. Always on per ADR-0012 §4.
    essential: true;
    analytics: boolean;
    sessionReplay: boolean;
  };
}

export function readConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    // Corrupted JSON in localStorage — treat as no consent recorded so the banner
    // reappears and the user re-consents. Not a bug to surface; this is the recovery path.
    return null;
  }
}

export function writeConsent(categories: {
  analytics: boolean;
  sessionReplay: boolean;
}): ConsentRecord {
  const record: ConsentRecord = {
    version: SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    categories: {
      essential: true,
      analytics: categories.analytics,
      sessionReplay: categories.sessionReplay,
    },
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  }
  return record;
}

export const consentDefaults = {
  acceptAll: { analytics: true, sessionReplay: true },
  rejectAll: { analytics: false, sessionReplay: false },
} as const;
