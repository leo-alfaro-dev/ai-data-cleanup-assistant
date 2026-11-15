import { isCalendarDate } from './isCalendarDate';
import { parseNamedDate } from './parseNamedDate';
import type { ParsedDate } from './parsedDate';

// Formats: 2024-03-04, 2024/03/04, 03/04/2024 (either order), Mar 4, 2024 and 4 Mar 2024.
export function parseDate(value: string): ParsedDate | null {
  const text = value.trim();
  const hasPossibleLength =
    text.length >= SHORTEST_DATE_LENGTH && text.length <= LONGEST_DATE_LENGTH;
  if (!hasPossibleLength) return null;

  return (
    parseYearFirstDate(text) ?? parseSlashDate(text) ?? parseNamedDate(text)
  );
}

// `1/1/2024` and `September 30, 2024`; any other length skips every pattern.
const SHORTEST_DATE_LENGTH = 8;
const LONGEST_DATE_LENGTH = 18;

const YEAR_FIRST = /^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/;

const SLASH = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

const SLASH_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY'] as const;

function parseYearFirstDate(text: string): ParsedDate | null {
  const match = YEAR_FIRST.exec(text);
  if (!match) return null;

  const [, year = '', separator = '', month = '', day = ''] = match;
  const date = { year: Number(year), month: Number(month), day: Number(day) };
  if (!isCalendarDate(date)) return null;

  const format = separator === '-' ? 'YYYY-MM-DD' : 'YYYY/MM/DD';
  return { isAmbiguous: false, formats: [format], date };
}

function parseSlashDate(text: string): ParsedDate | null {
  const match = SLASH.exec(text);
  if (!match) return null;

  const [, first = '', second = '', year = ''] = match;
  const monthFirst = {
    year: Number(year),
    month: Number(first),
    day: Number(second),
  };
  const dayFirst = {
    year: monthFirst.year,
    month: monthFirst.day,
    day: monthFirst.month,
  };
  const isMonthFirst = isCalendarDate(monthFirst);
  const isDayFirst = isCalendarDate(dayFirst);
  const fitsBothOrders = isMonthFirst && isDayFirst;
  const isSameDate = monthFirst.month === dayFirst.month;

  if (fitsBothOrders && isSameDate) {
    return { isAmbiguous: false, formats: SLASH_FORMATS, date: monthFirst };
  }
  if (fitsBothOrders) {
    return { isAmbiguous: true, formats: SLASH_FORMATS, monthFirst, dayFirst };
  }
  if (isMonthFirst) {
    return { isAmbiguous: false, formats: ['MM/DD/YYYY'], date: monthFirst };
  }
  if (isDayFirst) {
    return { isAmbiguous: false, formats: ['DD/MM/YYYY'], date: dayFirst };
  }

  return null;
}
