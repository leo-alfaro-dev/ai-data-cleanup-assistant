import type { DateFormat } from './dateFormat';
import { formatDate } from './formatDate';
import { parseDate } from './parseDate';

/**
 * The date written in `format`, or null when the value is not a date, reads as two different
 * dates, or is already written that way. Only a date with one certain meaning is rewritten.
 */
export function standardizeDate({
  value,
  format,
}: {
  value: string;
  format: DateFormat;
}): string | null {
  const parsed = parseDate(value);
  if (!parsed || parsed.isAmbiguous) return null;

  const standardized = formatDate({ date: parsed.date, format });

  return standardized === value ? null : standardized;
}
