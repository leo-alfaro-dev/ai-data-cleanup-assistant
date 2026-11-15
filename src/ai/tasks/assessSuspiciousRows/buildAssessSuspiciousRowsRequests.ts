import type { Dataset } from '@/engine/dataset/dataset';
import type { Issue } from '@/engine/issues/issue';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import { shortenValue } from '@/lib/shortenValue';
import {
  MAX_CELL_LENGTH,
  MAX_FLAGGING_ISSUES_PER_ROW,
  MAX_HEADER_LENGTH,
} from '../../textLimits';
import type { AssessSuspiciousRowsRequest } from './assessSuspiciousRowsContract';
import {
  MAX_COLUMNS_PER_ROW,
  MAX_FLAGGED_ROWS,
  MAX_SAMPLED_ROWS,
  MAX_TOP_VALUES,
} from './assessSuspiciousRowsContract';
import { pickSampleRows } from './pickSampleRows';

/**
 * One request: a summary of each column, the rows the checks flagged as suspicious (the ones
 * flagged most first), and a seeded sample of the others. A file small enough to fit sends every
 * row. A value longer than the cap is shortened with an ellipsis.
 */
export function buildAssessSuspiciousRowsRequests({
  dataset,
  profile,
  issues,
}: {
  dataset: Pick<Dataset, 'columns' | 'rows'>;
  profile: readonly ColumnProfile[];
  issues: readonly Issue[];
}): AssessSuspiciousRowsRequest[] {
  const rowCount = dataset.rows.length;
  if (rowCount === 0) return [];

  const columnCount = Math.min(dataset.columns.length, MAX_COLUMNS_PER_ROW);
  const flaggedBy = listFlaggingIssues(issues);
  const isSmallFile = rowCount <= MAX_FLAGGED_ROWS + MAX_SAMPLED_ROWS;

  const flagged = [...flaggedBy.keys()].sort(
    (first, second) =>
      (flaggedBy.get(second)?.length ?? 0) -
        (flaggedBy.get(first)?.length ?? 0) || first - second
  );
  const chosenFlagged = isSmallFile
    ? flagged
    : flagged.slice(0, MAX_FLAGGED_ROWS);
  const others = Array.from({ length: rowCount }, (_, rowId) => rowId).filter(
    (rowId) => !flaggedBy.has(rowId)
  );
  const sampled = isSmallFile
    ? others
    : pickSampleRows({
        rowIds: others,
        count: MAX_SAMPLED_ROWS,
        seed: rowCount * 31 + columnCount,
      });
  const rowIds = [...chosenFlagged, ...sampled];

  return [
    {
      columns: summarizeColumns({ dataset, profile, columnCount }),
      rows: rowIds.map((rowId, id) => ({
        id,
        rowId,
        flaggedBy: (flaggedBy.get(rowId) ?? []).slice(
          0,
          MAX_FLAGGING_ISSUES_PER_ROW
        ),
        cells: Array.from({ length: columnCount }, (_, column) =>
          shortenValue({
            value: dataset.rows[rowId]?.[column] ?? '',
            maxLength: MAX_CELL_LENGTH,
          })
        ),
      })),
      isComplete: rowIds.length === rowCount,
    },
  ];
}

function listFlaggingIssues(issues: readonly Issue[]): Map<number, string[]> {
  const flaggedBy = new Map<number, string[]>();

  for (const issue of issues) {
    if (issue.category !== 'suspicious') continue;

    for (const rowId of issue.rows) {
      flaggedBy.set(rowId, [...(flaggedBy.get(rowId) ?? []), issue.id]);
    }
  }

  return flaggedBy;
}

function summarizeColumns({
  dataset,
  profile,
  columnCount,
}: {
  dataset: Pick<Dataset, 'columns'>;
  profile: readonly ColumnProfile[];
  columnCount: number;
}): AssessSuspiciousRowsRequest['columns'] {
  return dataset.columns.slice(0, columnCount).map(({ header }, index) => {
    const column = profile[index];
    const range =
      column?.dominantType === 'integer' || column?.dominantType === 'decimal'
        ? {
            minimum: column.numbers.minimum,
            maximum: column.numbers.maximum,
            median: column.numbers.median,
          }
        : null;
    const topValues = column?.isIdentifierLike
      ? []
      : (column?.distinctValues ?? [])
          .filter(({ value }) => value.length <= MAX_CELL_LENGTH)
          .slice(0, MAX_TOP_VALUES);

    return {
      header: shortenValue({ value: header, maxLength: MAX_HEADER_LENGTH }),
      type: column?.dominantType ?? 'empty',
      distinctCount: column?.distinctCount ?? 0,
      blankCount: column?.blankCount ?? 0,
      range,
      topValues,
    };
  });
}
