import { parseDate } from '@/engine/values/parseDate';
import type { DateSummary } from './columnProfile';

export function summarizeDates({
  keys,
  counts,
}: {
  keys: readonly string[];
  counts: ReadonlyMap<string, number>;
}): DateSummary {
  const formatCounts: DateSummary['formatCounts'] = {
    'YYYY-MM-DD': 0,
    'YYYY/MM/DD': 0,
    'MM/DD/YYYY': 0,
    'DD/MM/YYYY': 0,
    'MMM D, YYYY': 0,
    'D MMM YYYY': 0,
  };
  let unknownOrderCount = 0;
  let ambiguousCount = 0;

  for (const key of keys) {
    const parsed = parseDate(key);
    if (!parsed) continue;

    const count = counts.get(key) ?? 0;
    const [format, otherFormat] = parsed.formats;
    const isOneFormat = otherFormat === undefined;

    if (isOneFormat) formatCounts[format] += count;
    else unknownOrderCount += count;
    if (parsed.isAmbiguous) ambiguousCount += count;
  }

  return { formatCounts, unknownOrderCount, ambiguousCount };
}
