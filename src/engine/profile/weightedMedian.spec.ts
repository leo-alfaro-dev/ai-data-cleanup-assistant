import { describe, expect, it } from 'vitest';
import { weightedMedian } from './weightedMedian';

describe('weightedMedian', () => {
  it('returns the middle value of an odd total', () => {
    const weights = new Map([
      [100, 1],
      [1, 1],
      [2, 1],
    ]);

    expect(weightedMedian(weights)).toBe(2);
  });

  it('averages the two middle values of an even total', () => {
    const weights = new Map([
      [4, 1],
      [1, 1],
      [3, 1],
      [2, 1],
    ]);

    expect(weightedMedian(weights)).toBe(2.5);
  });

  it('counts a value as many times as its weight', () => {
    expect(
      weightedMedian(
        new Map([
          [1, 3],
          [10, 1],
        ])
      )
    ).toBe(1);
    expect(
      weightedMedian(
        new Map([
          [1, 1],
          [10, 3],
        ])
      )
    ).toBe(10);
  });

  it('takes both middle values from one heavy value', () => {
    const weights = new Map([
      [1, 1],
      [2, 2],
      [3, 1],
    ]);

    expect(weightedMedian(weights)).toBe(2);
  });

  it('averages across the boundary between two weighted values', () => {
    const weights = new Map([
      [1, 2],
      [5, 2],
    ]);

    expect(weightedMedian(weights)).toBe(3);
  });

  it('reads negative values', () => {
    const weights = new Map([
      [-10, 1],
      [-2, 1],
      [7, 1],
    ]);

    expect(weightedMedian(weights)).toBe(-2);
  });

  it('returns the only value', () => {
    expect(weightedMedian(new Map([[42, 5]]))).toBe(42);
  });
});
