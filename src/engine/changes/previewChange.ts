import type { ColumnKey, Dataset, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { IssueId } from '@/engine/issues/issue';
import type { Change } from './change';
import type { ChangePreview } from './changePreview';
import { cleanCell } from './cleanCell';
import type { CleanPlan } from './cleanPlan';
import { compileCleanPlan } from './compileCleanPlan';
import { createChangeTally } from './createChangeTally';

export function previewChange({
  change,
  dataset,
}: {
  change: Change;
  dataset: Dataset;
}): ChangePreview {
  const plan = compileCleanPlan({
    accepted: [{ issueId: PREVIEW_ISSUE_ID, change }],
    dataset,
  });
  const tally = createChangeTally();

  const visit = ({ rowId, column }: { rowId: RowId; column: ColumnKey }) => {
    const before = dataset.rows[rowId]?.[column];
    if (before === undefined || plan.removedRows.has(rowId)) return;

    const cleaned = cleanCell({ plan, rowId, column, value: before });
    if (cleaned.isChanged) tally.add({ rowId, before, after: cleaned.value });
  };

  switch (change.kind) {
    case 'trimWhitespace':
    case 'mapValues':
    case 'standardizeDates': {
      const rowCount = dataset.rows.length;
      for (let index = 0; index < rowCount; index += 1) {
        visit({ rowId: toRowId(index), column: change.column });
      }
      break;
    }
    case 'setCells':
    case 'mergeRows':
      for (const cell of listPlannedCells(plan)) visit(cell);
      break;
    case 'dropDuplicateRows':
    case 'removeRows':
      break;
  }

  return tally.toPreview(plan.removedRows.size);
}

const PREVIEW_ISSUE_ID = 'preview' as IssueId;

function listPlannedCells(
  plan: CleanPlan
): { rowId: RowId; column: ColumnKey }[] {
  return [plan.explicitCells, plan.filledCells]
    .flatMap((cells) =>
      [...cells].flatMap(([rowId, columns]) =>
        [...columns.keys()].map((column) => ({ rowId, column }))
      )
    )
    .sort(
      (first, second) =>
        first.rowId - second.rowId || first.column - second.column
    );
}
