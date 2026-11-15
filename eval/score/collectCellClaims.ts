import type { RowId } from '@/engine/dataset/dataset';
import type { ScoredIssue } from './scoredIssue';
import { toCellKey } from './toCellKey';

export function collectCellClaims({
  issues,
  copyRows,
}: {
  issues: readonly ScoredIssue[];
  copyRows: ReadonlySet<RowId>;
}): { cells: Set<string>; rows: Set<RowId> } {
  const cells = new Set<string>();
  const rows = new Set<RowId>();

  for (const issue of issues) {
    for (const rowId of issue.rows) {
      if (copyRows.has(rowId)) continue;

      if (issue.column === null) rows.add(rowId);
      else cells.add(toCellKey({ rowId, column: issue.column }));
    }
  }

  return { cells, rows };
}
