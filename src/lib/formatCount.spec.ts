import { describe, expect, it } from 'vitest';
import { formatCount } from './formatCount';

describe('formatCount', () => {
  it('separates thousands', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(100_000)).toBe('100,000');
    expect(formatCount(2_000_000)).toBe('2,000,000');
  });
});
