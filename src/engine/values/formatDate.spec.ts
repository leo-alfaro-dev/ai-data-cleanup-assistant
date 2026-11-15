import { describe, expect, it } from 'vitest';
import type { CalendarDate } from './calendarDate';
import { DATE_FORMATS } from './dateFormat';
import type { DateFormat } from './dateFormat';
import { formatDate } from './formatDate';
import { MONTH_NAMES } from './monthNames';
import { parseDate } from './parseDate';

describe('formatDate', () => {
  it.each([
    { format: 'YYYY-MM-DD', expected: '2024-03-04' },
    { format: 'YYYY/MM/DD', expected: '2024/03/04' },
    { format: 'MM/DD/YYYY', expected: '03/04/2024' },
    { format: 'DD/MM/YYYY', expected: '04/03/2024' },
    { format: 'MMM D, YYYY', expected: 'Mar 4, 2024' },
    { format: 'D MMM YYYY', expected: '4 Mar 2024' },
  ] satisfies { format: DateFormat; expected: string }[])(
    'renders March 4, 2024 as $format',
    ({ format, expected }) => {
      expect(
        formatDate({ date: { year: 2024, month: 3, day: 4 }, format })
      ).toBe(expected);
    }
  );

  it.each([
    { format: 'YYYY-MM-DD', expected: '2024-12-31' },
    { format: 'YYYY/MM/DD', expected: '2024/12/31' },
    { format: 'MM/DD/YYYY', expected: '12/31/2024' },
    { format: 'DD/MM/YYYY', expected: '31/12/2024' },
    { format: 'MMM D, YYYY', expected: 'Dec 31, 2024' },
    { format: 'D MMM YYYY', expected: '31 Dec 2024' },
  ] satisfies { format: DateFormat; expected: string }[])(
    'renders a two-digit month and day as $format',
    ({ format, expected }) => {
      expect(
        formatDate({ date: { year: 2024, month: 12, day: 31 }, format })
      ).toBe(expected);
    }
  );

  it.each(MONTH_NAMES.map((name, index) => ({ name, month: index + 1 })))(
    'writes $name as its first three letters',
    ({ name, month }) => {
      const abbreviation = name.slice(0, 3);

      expect(
        formatDate({
          date: { year: 2024, month, day: 9 },
          format: 'MMM D, YYYY',
        })
      ).toBe(`${abbreviation} 9, 2024`);
      expect(
        formatDate({
          date: { year: 2024, month, day: 9 },
          format: 'D MMM YYYY',
        })
      ).toBe(`9 ${abbreviation} 2024`);
    }
  );

  it('pads a short year to four digits', () => {
    expect(
      formatDate({
        date: { year: 987, month: 3, day: 4 },
        format: 'YYYY-MM-DD',
      })
    ).toBe('0987-03-04');
  });

  it.each([
    { year: 2024, month: 3, day: 4 },
    { year: 2024, month: 12, day: 31 },
    { year: 2024, month: 2, day: 29 },
    { year: 2000, month: 1, day: 1 },
    { year: 1999, month: 10, day: 9 },
    { year: 2024, month: 4, day: 13 },
    { year: 2024, month: 5, day: 5 },
    { year: 2024, month: 11, day: 12 },
    { year: 1, month: 1, day: 1 },
  ])('is read back by parseDate as the same date: %o', (original) => {
    DATE_FORMATS.forEach((format) => {
      const rendered = formatDate({ date: original, format });

      expect(readBack({ value: rendered, format })).toEqual(original);
    });
  });
});

function readBack({
  value,
  format,
}: {
  value: string;
  format: DateFormat;
}): CalendarDate | null {
  const parsed = parseDate(value);
  if (!parsed) return null;

  const readsAsFormat = parsed.formats.some(
    (candidate) => candidate === format
  );
  if (!readsAsFormat) return null;
  if (!parsed.isAmbiguous) return parsed.date;

  return format === 'DD/MM/YYYY' ? parsed.dayFirst : parsed.monthFirst;
}
