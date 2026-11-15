import type { CalendarDate } from './calendarDate';

export function isCalendarDate({ year, month, day }: CalendarDate): boolean {
  const hasWholeParts =
    Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day);
  if (!hasWholeParts) return false;

  return year >= FIRST_YEAR && day >= 1 && day <= daysInMonth({ year, month });
}

const FIRST_YEAR = 1;

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const FEBRUARY = 2;

function daysInMonth({ year, month }: Pick<CalendarDate, 'year' | 'month'>) {
  if (month === FEBRUARY && isLeapYear(year)) return 29;

  return DAYS_IN_MONTH[month - 1] ?? 0;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
