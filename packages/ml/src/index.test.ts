import { describe, it, expect } from 'vitest';
import { hello } from './index';

describe('hello', () => {
  it('returns the bootstrap status string', () => {
    expect(hello()).toBe('packages/ml online');
  });
});
