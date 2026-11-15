import type { DateFormat } from './dateFormat';
import { isCalendarDate } from './isCalendarDate';
import type { ParsedDate } from './parsedDate';
import { toMonthNumber } from './toMonthNumber';

export function parseNamedDate(text: string): ParsedDate | null {
  const monthFirst = MONTH_FIRST.exec(text);
  if (monthFirst) {
    const [, name = '', day = '', year = ''] = monthFirst;
    return toParsedDate({ format: 'MMM D, YYYY', name, day, year });
  }

  const dayFirst = DAY_FIRST.exec(text);
  if (dayFirst) {
    const [, day = '', name = '', year = ''] = dayFirst;
    return toParsedDate({ format: 'D MMM YYYY', name, day, year });
  }

  return null;
}

const MONTH_FIRST = /^([A-Za-z]{3,9}) (\d{1,2}), (\d{4})$/;

const DAY_FIRST = /^(\d{1,2}) ([A-Za-z]{3,9}) (\d{4})$/;

function toParsedDate({
  format,
  name,
  day,
  year,
}: {
  format: DateFormat;
  name: string;
  day: string;
  year: string;
}): ParsedDate | null {
  const month = toMonthNumber(name);
  if (month === null) return null;

  const date = { year: Number(year), month, day: Number(day) };
  if (!isCalendarDate(date)) return null;

  return { isAmbiguous: false, formats: [format], date };
}
