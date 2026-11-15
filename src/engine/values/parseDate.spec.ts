import { describe, expect, it } from 'vitest';
import type { CalendarDate } from './calendarDate';
import type { DateFormat } from './dateFormat';
import { parseDate } from './parseDate';

describe('parseDate', () => {
  it.each([
    {
      value: '2024-03-04',
      format: 'YYYY-MM-DD',
      date: { year: 2024, month: 3, day: 4 },
    },
    {
      value: '2024-3-4',
      format: 'YYYY-MM-DD',
      date: { year: 2024, month: 3, day: 4 },
    },
    {
      value: '2024/03/04',
      format: 'YYYY/MM/DD',
      date: { year: 2024, month: 3, day: 4 },
    },
    {
      value: '2024/3/4',
      format: 'YYYY/MM/DD',
      date: { year: 2024, month: 3, day: 4 },
    },
    {
      value: 'Mar 4, 2024',
      format: 'MMM D, YYYY',
      date: { year: 2024, month: 3, day: 4 },
    },
    {
      value: 'March 4, 2024',
      format: 'MMM D, YYYY',
      date: { year: 2024, month: 3, day: 4 },
    },
    {
      value: 'MARCH 04, 2024',
      format: 'MMM D, YYYY',
      date: { year: 2024, month: 3, day: 4 },
    },
    {
      value: 'mar 4, 2024',
      format: 'MMM D, YYYY',
      date: { year: 2024, month: 3, day: 4 },
    },
    {
      value: 'May 4, 2024',
      format: 'MMM D, YYYY',
      date: { year: 2024, month: 5, day: 4 },
    },
    {
      value: '4 Mar 2024',
      format: 'D MMM YYYY',
      date: { year: 2024, month: 3, day: 4 },
    },
    {
      value: '04 march 2024',
      format: 'D MMM YYYY',
      date: { year: 2024, month: 3, day: 4 },
    },
    {
      value: '4 MAR 2024',
      format: 'D MMM YYYY',
      date: { year: 2024, month: 3, day: 4 },
    },
    {
      value: '1 May 2024',
      format: 'D MMM YYYY',
      date: { year: 2024, month: 5, day: 1 },
    },
  ] satisfies { value: string; format: DateFormat; date: CalendarDate }[])(
    'reads $value as $format',
    ({ value, format, date }) => {
      expect(parseDate(value)).toEqual({
        isAmbiguous: false,
        formats: [format],
        date,
      });
    }
  );

  it.each([
    {
      value: '13/04/2024',
      format: 'DD/MM/YYYY',
      date: { year: 2024, month: 4, day: 13 },
    },
    {
      value: '04/13/2024',
      format: 'MM/DD/YYYY',
      date: { year: 2024, month: 4, day: 13 },
    },
    {
      value: '31/12/2024',
      format: 'DD/MM/YYYY',
      date: { year: 2024, month: 12, day: 31 },
    },
    {
      value: '12/31/2024',
      format: 'MM/DD/YYYY',
      date: { year: 2024, month: 12, day: 31 },
    },
    {
      value: '29/02/2024',
      format: 'DD/MM/YYYY',
      date: { year: 2024, month: 2, day: 29 },
    },
    {
      value: '02/29/2024',
      format: 'MM/DD/YYYY',
      date: { year: 2024, month: 2, day: 29 },
    },
  ] satisfies { value: string; format: DateFormat; date: CalendarDate }[])(
    'reads the slash date $value in one order only: $format',
    ({ value, format, date }) => {
      expect(parseDate(value)).toEqual({
        isAmbiguous: false,
        formats: [format],
        date,
      });
    }
  );

  it.each([
    {
      value: '03/04/2024',
      monthFirst: { year: 2024, month: 3, day: 4 },
      dayFirst: { year: 2024, month: 4, day: 3 },
    },
    {
      value: '3/4/2024',
      monthFirst: { year: 2024, month: 3, day: 4 },
      dayFirst: { year: 2024, month: 4, day: 3 },
    },
    {
      value: '12/11/2024',
      monthFirst: { year: 2024, month: 12, day: 11 },
      dayFirst: { year: 2024, month: 11, day: 12 },
    },
    {
      value: '01/12/2024',
      monthFirst: { year: 2024, month: 1, day: 12 },
      dayFirst: { year: 2024, month: 12, day: 1 },
    },
  ])(
    'reports $value as ambiguous with both readings and neither chosen',
    ({ value, monthFirst, dayFirst }) => {
      expect(parseDate(value)).toEqual({
        isAmbiguous: true,
        formats: ['MM/DD/YYYY', 'DD/MM/YYYY'],
        monthFirst,
        dayFirst,
      });
    }
  );

  it.each([
    { value: '04/04/2024', expected: { year: 2024, month: 4, day: 4 } },
    { value: '4/04/2024', expected: { year: 2024, month: 4, day: 4 } },
    { value: '1/1/2024', expected: { year: 2024, month: 1, day: 1 } },
    { value: '12/12/2024', expected: { year: 2024, month: 12, day: 12 } },
  ])(
    'reads $value as one date that fits both orders, so it is not ambiguous',
    ({ value, expected }) => {
      expect(parseDate(value)).toEqual({
        isAmbiguous: false,
        formats: ['MM/DD/YYYY', 'DD/MM/YYYY'],
        date: expected,
      });
    }
  );

  it.each([
    { value: '2024-02-29', date: { year: 2024, month: 2, day: 29 } },
    { value: '2000-02-29', date: { year: 2000, month: 2, day: 29 } },
    { value: 'Feb 29, 2024', date: { year: 2024, month: 2, day: 29 } },
    { value: '29 Feb 2024', date: { year: 2024, month: 2, day: 29 } },
  ])('accepts the leap day $value', ({ value, date }) => {
    expect(parseDate(value)).toMatchObject({ isAmbiguous: false, date });
  });

  it.each([
    '2023-02-29',
    '2100-02-29',
    '1900-02-29',
    '02/29/2023',
    '29/02/2023',
    'Feb 29, 2023',
    '29 Feb 2023',
  ])('rejects the missing leap day %s', (value) => {
    expect(parseDate(value)).toBeNull();
  });

  it.each([
    { name: 'the longest format', value: 'September 30, 2024' },
    { name: 'the longest day-first format', value: '30 September 2024' },
    { name: 'the shortest slash format', value: '1/1/2024' },
    { name: 'the shortest year-first format', value: '2024-1-1' },
  ])('reads $name', ({ value }) => {
    expect(parseDate(value)).not.toBeNull();
  });

  it.each([
    { name: 'spaces', value: ' 2024-03-04 ' },
    { name: 'non-breaking spaces', value: '\u00A0Mar 4, 2024\u00A0' },
    { name: 'a tab and a line break', value: '\t4 Mar 2024\n' },
  ])('ignores surrounding $name', ({ value }) => {
    expect(parseDate(value)).toMatchObject({ isAmbiguous: false });
  });

  it.each([
    { name: 'February 30', value: '02/30/2024' },
    { name: 'February 30 in a year-first date', value: '2024-02-30' },
    { name: 'month 13', value: '2024-13-01' },
    { name: 'month 0', value: '2024-00-10' },
    { name: 'day 0', value: '2024-03-00' },
    { name: 'April 31', value: '2024-04-31' },
    { name: 'April 31 with both orders tried', value: '31/04/2024' },
    { name: 'neither order making sense', value: '13/13/2024' },
    { name: 'all zeros', value: '00/00/0000' },
    { name: 'year 0', value: '0000-01-01' },
    { name: 'February 30 with a month name', value: 'Feb 30, 2024' },
    { name: 'April 31 with a day-first month name', value: '31 Apr 2024' },
  ])('rejects a date that does not exist: $name', ({ value }) => {
    expect(parseDate(value)).toBeNull();
  });

  it.each([
    { name: 'an empty value', value: '' },
    { name: 'a blank value', value: ' \u00A0 ' },
    { name: 'text', value: 'hello world' },
    { name: 'a placeholder', value: 'N/A' },
    { name: 'a plain number', value: '12345678' },
    { name: 'a phone number', value: '555-0123' },
    { name: 'a two-digit year', value: '03/04/24' },
    { name: 'a two-digit year after a month name', value: 'Mar 4, 24' },
    { name: 'a time stamp', value: '2024-03-04T10:00:00' },
    { name: 'a date with a time', value: '2024-03-04 10:30' },
    { name: 'dots as separators', value: '2024.03.04' },
    { name: 'hyphens in a month-first date', value: '03-04-2024' },
    { name: 'mixed separators', value: '2024-03/04' },
    { name: 'an unknown month name', value: 'Foo 4, 2024' },
    { name: 'an unknown month name before the year', value: '4 Foo 2024' },
    { name: 'a misspelled month name', value: 'Marc 4, 2024' },
    { name: 'a month name without a comma', value: 'Mar 4 2024' },
    { name: 'a comma in a day-first date', value: '4 Mar, 2024' },
    { name: 'an ordinal day', value: 'March 4th, 2024' },
    { name: 'an abbreviation with a period', value: 'Mar. 4, 2024' },
    { name: 'a four-letter month abbreviation', value: 'Sept 4, 2024' },
    { name: 'a month with no day', value: 'March 2024' },
    { name: 'a year with no separators', value: '20240304' },
    { name: 'trailing text', value: '2024-03-04 approx' },
    { name: 'a three-digit year', value: '03/04/202' },
  ])('rejects $name', ({ value }) => {
    expect(parseDate(value)).toBeNull();
  });
});
