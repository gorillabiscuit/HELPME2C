export * from './recommendation';

// Phase 2 bootstrap placeholder — used by apps/web's tRPC `hello` smoke test
// (apps/web/src/server/router.ts). Removed in M4 commit 6 when the dashboard
// drops the system-status block in favour of the personal-rec grid.
export function hello(): string {
  return 'packages/ml online';
}
