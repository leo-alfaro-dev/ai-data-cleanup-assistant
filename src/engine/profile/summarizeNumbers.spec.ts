import { describe, expect, it } from 'vitest';
import { summarizeNumbers } from './summarizeNumbers';

describe('summarizeNumbers', () => {
  it('summarizes the spread of distinct numbers', () => {
    const counts = new Map([
      ['1', 1],
      ['2', 1],
      ['3', 1],
      ['4', 1],
      ['100', 1],
    ]);

    expect(summarizeNumbers({ keys: [...counts.keys()], counts })).toEqual({
      count: 5,
      minimum: 1,
      maximum: 100,
      median: 3,
      medianAbsoluteDeviation: 1,
    });
  });

  it('weights each number by its count', () => {
    const counts = new Map([
      ['5', 3],
      ['10', 1],
    ]);

    expect(summarizeNumbers({ keys: ['5', '10'], counts })).toEqual({
      count: 4,
      minimum: 5,
      maximum: 10,
      median: 5,
      medianAbsoluteDeviation: 0,
    });
  });

  it('merges spellings of one number', () => {
    const counts = new Map([
      ['5', 1],
      ['5.0', 1],
      ['$5', 1],
      ['9', 1],
    ]);

    expect(summarizeNumbers({ keys: [...counts.keys()], counts })).toEqual({
      count: 4,
      minimum: 5,
      maximum: 9,
      median: 5,
      medianAbsoluteDeviation: 0,
    });
  });

  it('reads separators, percent signs and negatives', () => {
    const counts = new Map([
      ['1,000', 1],
      ['50%', 1],
      ['-20', 1],
    ]);

    expect(
      summarizeNumbers({ keys: [...counts.keys()], counts })
    ).toMatchObject({ count: 3, minimum: -20, maximum: 1000, median: 50 });
  });

  it('leaves out keys that are not numbers', () => {
    const counts = new Map([
      ['8', 2],
      ['n/a', 5],
    ]);

    expect(summarizeNumbers({ keys: ['8', 'n/a'], counts })).toMatchObject({
      count: 2,
      minimum: 8,
      maximum: 8,
    });
  });
});
