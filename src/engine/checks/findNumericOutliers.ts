import type { ColumnKey, Dataset, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import type { NumberSummary } from '@/engine/profile/columnProfile';
import { parseNumber } from '@/engine/values/parseNumber';
import type { Check } from './check';
import { toCheckId } from './toCheckId';
import { toOutlierScale } from './toOutlierScale';

const id = toCheckId('numeric-outliers');

export const findNumericOutliers: Check = {
  id,
  category: 'suspicious',
  find({ dataset, profile }) {
    return profile.flatMap((columnProfile) => {
      const isNumeric =
        columnProfile.dominantType === 'integer' ||
        columnProfile.dominantType === 'decimal';
      if (!isNumeric) return [];

      return findInColumn({
        rows: dataset.rows,
        column: columnProfile.column,
        numbers: columnProfile.numbers,
      });
    });
  },
};

const MIN_NUMERIC_VALUES = 30;

// A column is "otherwise positive" when negatives are rarer than this.
const MAX_NEGATIVE_SHARE = 0.05;

function findInColumn({
  rows,
  column,
  numbers,
}: {
  rows: Dataset['rows'];
  column: ColumnKey;
  numbers: NumberSummary;
}): Issue[] {
  const { count, median, medianAbsoluteDeviation } = numbers;
  const hasEnoughSpread =
    count >= MIN_NUMERIC_VALUES && medianAbsoluteDeviation > 0;
  if (!hasEnoughSpread) return [];

  const { rowIds, values } = scanNumbers({ rows, column });
  const negativeRows = rowIds.filter((_, index) => (values[index] ?? 0) < 0);
  const isOtherwisePositive =
    median > 0 && negativeRows.length / count < MAX_NEGATIVE_SHARE;
  const scale = toOutlierScale({ values, isOtherwisePositive });

  const outlierRows = rowIds.filter((_, index) => {
    const number = values[index] ?? 0;
    const isListedAsNegative = isOtherwisePositive && number < 0;

    return !isListedAsNegative && (scale?.isOutlier(number) ?? false);
  });
  const issues: Issue[] = [];

  if (scale && outlierRows.length > 0) {
    issues.push({
      id: toIssueId(`${id}:${column}`),
      category: 'suspicious',
      source: 'check',
      confidence: 'medium',
      rows: outlierRows,
      column,
      suggestion: null,
      details: {
        kind: 'numericOutliers',
        median,
        lowerLimit: scale.lowerLimit,
        upperLimit: scale.upperLimit,
      },
    });
  }

  if (isOtherwisePositive && negativeRows.length > 0) {
    issues.push({
      id: toIssueId(`${id}:${column}:negatives`),
      category: 'suspicious',
      source: 'check',
      confidence: 'medium',
      rows: negativeRows,
      column,
      suggestion: null,
      details: { kind: 'negativeValues', median },
    });
  }

  return issues;
}

function scanNumbers({
  rows,
  column,
}: {
  rows: Dataset['rows'];
  column: ColumnKey;
}): { rowIds: RowId[]; values: Float64Array } {
  const rowIds: RowId[] = [];
  const numbers: number[] = [];

  rows.forEach((row, index) => {
    const number = parseNumber(row[column] ?? '');
    if (number === null) return;

    rowIds.push(toRowId(index));
    numbers.push(number);
  });

  return { rowIds, values: Float64Array.from(numbers) };
}
