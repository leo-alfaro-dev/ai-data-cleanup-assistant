import { describe, expect, it } from 'vitest';
import { medianOf } from './medianOf';

describe('medianOf', () => {
  it.each([
    { name: 'one value', values: [7], expected: 7 },
    { name: 'an odd count', values: [9, 1, 5], expected: 5 },
    { name: 'an even count', values: [4, 1, 3, 2], expected: 2.5 },
    { name: 'negatives and decimals', values: [-3, 0.5, -1.5], expected: -1.5 },
    { name: 'repeated values', values: [2, 2, 2, 9], expected: 2 },
    {
      name: 'numbers that sort differently as text',
      values: [10, 9, 100],
      expected: 10,
    },
  ])('reads $name', ({ values, expected }) => {
    expect(medianOf(Float64Array.from(values))).toBe(expected);
  });

  it('gives 0 for no values', () => {
    expect(medianOf(new Float64Array(0))).toBe(0);
  });
});
