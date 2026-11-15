import { describe, expect, it } from 'vitest';
import { formatTokens } from './formatTokens';

describe('formatTokens', () => {
  it('shows fewer than a thousand as they are', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(999)).toBe('999');
  });

  it('shows thousands with one decimal, and from a hundred thousand none', () => {
    expect(formatTokens(1000)).toBe('1.0k');
    expect(formatTokens(4123)).toBe('4.1k');
    expect(formatTokens(99_949)).toBe('99.9k');
    expect(formatTokens(250_400)).toBe('250k');
  });

  it('shows millions with one decimal, and never a thousand thousands', () => {
    expect(formatTokens(999_499)).toBe('999k');
    expect(formatTokens(999_999)).toBe('1.0M');
    expect(formatTokens(1_000_000)).toBe('1.0M');
    expect(formatTokens(12_340_000)).toBe('12.3M');
  });
});
