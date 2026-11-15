import { describe, expect, it } from 'vitest';
import { formatNumber } from './formatNumber';

describe('formatNumber', () => {
  it('groups thousands and keeps at most two decimals', () => {
    expect(formatNumber(1234567.891)).toBe('1,234,567.89');
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(-0.5)).toBe('-0.5');
  });
});
