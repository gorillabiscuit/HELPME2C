import { describe, it, expect } from 'vitest';
import { toIsoUtc } from './index';

describe('toIsoUtc', () => {
  it('returns ISO-8601 UTC with Z suffix', () => {
    const date = new Date('2026-05-04T10:30:45.123Z');
    expect(toIsoUtc(date)).toBe('2026-05-04T10:30:45.123Z');
  });
});
