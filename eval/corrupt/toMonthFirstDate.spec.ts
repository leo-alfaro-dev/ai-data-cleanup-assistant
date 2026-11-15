import { describe, expect, it } from 'vitest';
import { toMonthFirstDate } from './toMonthFirstDate';

describe('toMonthFirstDate', () => {
  it.each([
    { isoDate: '2024-03-04', expected: '03/04/2024' },
    { isoDate: '2022-12-31', expected: '12/31/2022' },
    { isoDate: '2023-01-09', expected: '01/09/2023' },
  ])('writes $isoDate as $expected', ({ isoDate, expected }) => {
    expect(toMonthFirstDate(isoDate)).toBe(expected);
  });

  it('throws on a value that is not a single-reading date', () => {
    expect(() => toMonthFirstDate('03/04/2024')).toThrow(
      'Expected one reading'
    );
    expect(() => toMonthFirstDate('not a date')).toThrow(
      'Expected one reading'
    );
  });
});
