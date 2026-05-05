// Centralizes the ISO-8601 UTC + Z-suffix invariant for API datetimes
// (CLAUDE.md §2). Wrapping toISOString gives one call site to update if
// the format ever needs to change.
export function toIsoUtc(date: Date): string {
  return date.toISOString();
}
