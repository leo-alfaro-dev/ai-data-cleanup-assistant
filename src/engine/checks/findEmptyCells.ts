import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import { isBlankRow } from '@/engine/rows/isBlankRow';
import { isBlank } from '@/engine/values/isBlank';
import type { Check } from './check';
import { toCheckId } from './toCheckId';

const id = toCheckId('empty-cells');

export const findEmptyCells: Check = {
  id,
  category: 'missing',
  find({ dataset }) {
    const tallies = dataset.columns
      .slice(0, dataset.structure.headerCellCount)
      .map(({ key }): Tally => ({ column: key, rows: [], filledCount: 0 }));

    for (const [index, row] of dataset.rows.entries()) {
      if (isBlankRow(row)) continue;

      for (const tally of tallies) {
        if (isBlank(row[tally.column] ?? '')) {
          tally.rows.push(toRowId(index));
        } else {
          tally.filledCount += 1;
        }
      }
    }

    return tallies.filter(({ rows }) => rows.length > 0).map(toIssue);
  },
};

type Tally = {
  column: ColumnKey;
  rows: RowId[];
  filledCount: number;
};

function toIssue({ column, rows, filledCount }: Tally): Issue {
  return {
    id: toIssueId(`${id}:${column}`),
    category: 'missing',
    source: 'check',
    confidence: 'certain',
    rows,
    column,
    suggestion: null,
    details: { kind: 'emptyCells', filledCount },
  };
}
