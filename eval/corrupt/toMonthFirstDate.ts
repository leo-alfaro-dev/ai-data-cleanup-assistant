import { formatDate } from '@/engine/values/formatDate';
import { parseDate } from '@/engine/values/parseDate';

export function toMonthFirstDate(isoDate: string): string {
  const parsed = parseDate(isoDate);
  if (parsed === null || parsed.isAmbiguous) {
    throw new Error(`Expected one reading of "${isoDate}"`);
  }

  return formatDate({ date: parsed.date, format: 'MM/DD/YYYY' });
}
