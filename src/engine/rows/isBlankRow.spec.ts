import { describe, expect, it } from 'vitest';
import { isBlankRow } from './isBlankRow';

describe('isBlankRow', () => {
  it('is true when every cell is empty or whitespace, non-breaking spaces included', () => {
    expect(isBlankRow(['', ' ', ' ', '\t'])).toBe(true);
  });

  it('is false when one cell has content', () => {
    expect(isBlankRow(['', '', 'x'])).toBe(false);
  });
});
