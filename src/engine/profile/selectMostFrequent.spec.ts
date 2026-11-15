import { describe, expect, it } from 'vitest';
import { selectMostFrequent } from './selectMostFrequent';

describe('selectMostFrequent', () => {
  it('orders by count, then by first appearance', () => {
    const counts = new Map([
      ['a', 1],
      ['b', 3],
      ['c', 2],
      ['d', 3],
      ['e', 2],
    ]);

    expect(selectMostFrequent({ counts, limit: 10 })).toEqual([
      { value: 'b', count: 3 },
      { value: 'd', count: 3 },
      { value: 'c', count: 2 },
      { value: 'e', count: 2 },
      { value: 'a', count: 1 },
    ]);
  });

  it('keeps the most frequent values when over the limit', () => {
    const counts = new Map([
      ['a', 1],
      ['b', 3],
      ['c', 2],
      ['d', 3],
      ['e', 2],
    ]);

    expect(
      selectMostFrequent({ counts, limit: 3 }).map(({ value }) => value)
    ).toEqual(['b', 'd', 'c']);
  });

  it('keeps the earliest values of the tied count that is cut', () => {
    const counts = new Map([
      ['a', 1],
      ['b', 1],
      ['c', 1],
      ['d', 1],
    ]);

    expect(
      selectMostFrequent({ counts, limit: 2 }).map(({ value }) => value)
    ).toEqual(['a', 'b']);
  });

  it('returns everything when the limit is not reached', () => {
    const counts = new Map([
      ['a', 2],
      ['b', 1],
    ]);

    expect(selectMostFrequent({ counts, limit: 5 })).toEqual([
      { value: 'a', count: 2 },
      { value: 'b', count: 1 },
    ]);
  });

  it('handles one count far above the rest', () => {
    const counts = new Map([
      ['rare', 1],
      ['common', 100_000],
    ]);

    expect(selectMostFrequent({ counts, limit: 5 })).toEqual([
      { value: 'common', count: 100_000 },
      { value: 'rare', count: 1 },
    ]);
  });

  it('returns nothing for no values', () => {
    expect(selectMostFrequent({ counts: new Map(), limit: 5 })).toEqual([]);
  });
});
