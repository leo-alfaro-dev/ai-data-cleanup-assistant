import type { ColumnKey, Dataset } from '@/engine/dataset/dataset';
import { detectValueType } from '@/engine/values/detectValueType';
import { isBlank } from '@/engine/values/isBlank';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import type { ColumnProfile, TypeCounts } from './columnProfile';
import { selectMostFrequent } from './selectMostFrequent';
import { summarizeDates } from './summarizeDates';
import { summarizeNumbers } from './summarizeNumbers';
import { toDominantType } from './toDominantType';

export function profileColumn({
  dataset,
  column,
}: {
  dataset: Dataset;
  column: ColumnKey;
}): ColumnProfile {
  const { counts, blankCount, nonBlankCount } = countValues({
    rows: dataset.rows,
    column,
  });
  const distinctCount = counts.size;
  const distinctShare = distinctCount / nonBlankCount;
  const hasValues = nonBlankCount > 0;

  const isCategorical =
    hasValues &&
    distinctCount <= MAX_CATEGORICAL_DISTINCT_VALUES &&
    distinctShare <= MAX_CATEGORICAL_DISTINCT_SHARE;
  const isIdentifierLike =
    hasValues && distinctShare >= IDENTIFIER_DISTINCT_SHARE;

  const base = {
    column,
    blankCount,
    nonBlankCount,
    distinctCount,
    distinctValues: selectMostFrequent({ counts, limit: MAX_DISTINCT_VALUES }),
    hasTruncatedDistinctValues: distinctCount > MAX_DISTINCT_VALUES,
    isCategorical,
    isIdentifierLike,
  };
  if (!hasValues) return { ...base, dominantType: 'empty' };

  const { typeCounts, numberKeys, dateKeys } = classifyValues(counts);
  const dominantType = toDominantType({ typeCounts, nonBlankCount });
  const typed = { ...base, typeCounts };

  if (dominantType === 'integer' || dominantType === 'decimal') {
    const numbers = summarizeNumbers({ keys: numberKeys, counts });
    return { ...typed, dominantType, numbers };
  }
  if (dominantType === 'date') {
    const dates = summarizeDates({ keys: dateKeys, counts });
    return { ...typed, dominantType, dates };
  }

  return { ...typed, dominantType };
}

// Keeps the profile small enough to cross the worker boundary; distinctCount stays exact.
export const MAX_DISTINCT_VALUES = 5000;

// About as many values as a reviewer can scan; past it a column is free text or a code.
const MAX_CATEGORICAL_DISTINCT_VALUES = 200;

// A category repeats at least twice on average.
const MAX_CATEGORICAL_DISTINCT_SHARE = 0.5;

// Tolerates the odd repeat in a column meant to be unique.
const IDENTIFIER_DISTINCT_SHARE = 0.95;

function countValues({
  rows,
  column,
}: {
  rows: Dataset['rows'];
  column: ColumnKey;
}) {
  const counts = new Map<string, number>();
  let blankCount = 0;

  for (const row of rows) {
    const value = row[column] ?? '';
    if (isBlank(value)) {
      blankCount++;
      continue;
    }

    const key = normalizeWhitespace(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return { counts, blankCount, nonBlankCount: rows.length - blankCount };
}

function classifyValues(counts: ReadonlyMap<string, number>) {
  const typeCounts: TypeCounts = {
    integer: 0,
    decimal: 0,
    boolean: 0,
    date: 0,
    email: 0,
    phone: 0,
    url: 0,
    text: 0,
  };
  const numberKeys: string[] = [];
  const dateKeys: string[] = [];

  for (const [value, count] of counts) {
    const type = detectValueType(value);
    if (type === 'empty') continue;

    typeCounts[type] += count;
    if (type === 'integer' || type === 'decimal') numberKeys.push(value);
    if (type === 'date') dateKeys.push(value);
  }

  return { typeCounts, numberKeys, dateKeys };
}
