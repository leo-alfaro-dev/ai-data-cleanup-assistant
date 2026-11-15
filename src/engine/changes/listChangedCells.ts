import type { ColumnKey, Dataset, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Change } from './change';
import type { ChangedCell } from './changedCell';
import { cleanCell } from './cleanCell';
import type { CleanPlan } from './cleanPlan';

// The change names which cells to look at; the plan says what they become.
export function* listChangedCells({
  change,
  plan,
  dataset,
}: {
  change: Change;
  plan: CleanPlan;
  dataset: Dataset;
}): Generator<ChangedCell> {
  for (const { rowId, column } of listCandidateCells({
    change,
    plan,
    dataset,
  })) {
    const before = dataset.rows[rowId]?.[column];
    if (before === undefined || plan.removedRows.has(rowId)) continue;

    const cleaned = cleanCell({ plan, rowId, column, value: before });
    if (cleaned.isChanged) {
      yield { rowId, column, before, after: cleaned.value };
    }
  }
}

function* listCandidateCells({
  change,
  plan,
  dataset,
}: {
  change: Change;
  plan: CleanPlan;
  dataset: Dataset;
}): Generator<{ rowId: RowId; column: ColumnKey }> {
  switch (change.kind) {
    case 'trimWhitespace':
    case 'mapValues':
    case 'standardizeDates': {
      const rowCount = dataset.rows.length;
      for (let index = 0; index < rowCount; index += 1) {
        yield { rowId: toRowId(index), column: change.column };
      }
      return;
    }
    case 'setCells':
    case 'mergeRows':
      yield* listPlannedCells(plan);
      return;
    case 'dropDuplicateRows':
    case 'removeRows':
      return;
  }
}

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
