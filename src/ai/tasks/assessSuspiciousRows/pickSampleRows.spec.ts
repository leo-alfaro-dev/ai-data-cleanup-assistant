import { describe, expect, it } from 'vitest';
import { pickSampleRows } from './pickSampleRows';

const rows = Array.from({ length: 1000 }, (_, index) => index);

describe('pickSampleRows', () => {
  it('picks the count asked for, each row once, in ascending order', () => {
    const sample = pickSampleRows({ rowIds: rows, count: 40, seed: 7 });

    expect(sample).toHaveLength(40);
    expect(new Set(sample).size).toBe(40);
    expect(sample).toEqual([...sample].sort((first, second) => first - second));
    expect(sample.every((rowId) => rows.includes(rowId))).toBe(true);
  });

  it('gives the same sample for the same seed and another for another seed', () => {
    const first = pickSampleRows({ rowIds: rows, count: 40, seed: 7 });

    expect(pickSampleRows({ rowIds: rows, count: 40, seed: 7 })).toEqual(first);
    expect(pickSampleRows({ rowIds: rows, count: 40, seed: 8 })).not.toEqual(
      first
    );
  });

  it('reaches the whole range, not only the first rows', () => {
    const sample = pickSampleRows({ rowIds: rows, count: 40, seed: 3 });

    expect(sample.at(-1)).toBeGreaterThan(700);
    expect(sample[0]).toBeLessThan(300);
  });

  it('takes every row when there are no more than the count', () => {
    expect(pickSampleRows({ rowIds: [4, 9, 2], count: 3, seed: 1 })).toEqual([
      4, 9, 2,
    ]);
    expect(pickSampleRows({ rowIds: [], count: 5, seed: 1 })).toEqual([]);
  });

  it('does not change the rows it was given', () => {
    const given = [...rows];

    pickSampleRows({ rowIds: given, count: 40, seed: 7 });

    expect(given).toEqual(rows);
  });
});
