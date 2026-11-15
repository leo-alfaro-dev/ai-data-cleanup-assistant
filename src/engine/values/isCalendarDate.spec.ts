import { describe, expect, it } from 'vitest';
import { isCalendarDate } from './isCalendarDate';

describe('isCalendarDate', () => {
  it.each([
    { year: 2024, month: 1, day: 31 },
    { year: 2024, month: 4, day: 30 },
    { year: 2023, month: 2, day: 28 },
    { year: 2024, month: 2, day: 29 },
    { year: 2000, month: 2, day: 29 },
    { year: 2024, month: 12, day: 31 },
    { year: 1, month: 1, day: 1 },
    { year: 9999, month: 12, day: 31 },
  ])('accepts $year-$month-$day', (date) => {
    expect(isCalendarDate(date)).toBe(true);
  });

  it.each([
    { name: 'a leap day in a common year', year: 2023, month: 2, day: 29 },
    { name: 'a leap day in a century year', year: 1900, month: 2, day: 29 },
    { name: 'February 30', year: 2024, month: 2, day: 30 },
    { name: 'April 31', year: 2024, month: 4, day: 31 },
    { name: 'June 31', year: 2024, month: 6, day: 31 },
    { name: 'month 0', year: 2024, month: 0, day: 10 },
    { name: 'month 13', year: 2024, month: 13, day: 10 },
    { name: 'day 0', year: 2024, month: 1, day: 0 },
    { name: 'day 32', year: 2024, month: 1, day: 32 },
    { name: 'year 0', year: 0, month: 1, day: 1 },
    { name: 'a fractional day', year: 2024, month: 1, day: 1.5 },
    {
      name: 'a part that is not a number',
      year: 2024,
      month: Number.NaN,
      day: 1,
    },
  ])('rejects $name', ({ year, month, day }) => {
    expect(isCalendarDate({ year, month, day })).toBe(false);
  });
});
