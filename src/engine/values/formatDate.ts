import type { CalendarDate } from './calendarDate';
import type { DateFormat } from './dateFormat';
import { MONTH_ABBREVIATIONS } from './monthNames';

export function formatDate({
  date,
  format,
}: {
  date: CalendarDate;
  format: DateFormat;
}): string {
  const year = String(date.year).padStart(YEAR_DIGITS, '0');
  const month = String(date.month).padStart(PART_DIGITS, '0');
  const day = String(date.day).padStart(PART_DIGITS, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY/MM/DD':
      return `${year}/${month}/${day}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MMM D, YYYY':
      return `${toMonthAbbreviation(date.month)} ${date.day}, ${year}`;
    case 'D MMM YYYY':
      return `${date.day} ${toMonthAbbreviation(date.month)} ${year}`;
  }
}

const YEAR_DIGITS = 4;

const PART_DIGITS = 2;

function toMonthAbbreviation(month: number): string {
  return MONTH_ABBREVIATIONS[month - 1] ?? '';
}
