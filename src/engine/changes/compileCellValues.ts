import type { ColumnKey, Dataset, RowId } from '@/engine/dataset/dataset';
import type { CellReplacements, Replacement } from './cleanPlan';
import type { PlanEntry } from './planEntry';

export function compileCellValues({
  entries,
  dataset,
}: {
  entries: readonly PlanEntry[];
  dataset: Dataset;
}): { explicitCells: CellReplacements; filledCells: CellReplacements } {
  const explicitCells = new Map<RowId, Map<ColumnKey, Replacement>>();
  const filledCells = new Map<RowId, Map<ColumnKey, Replacement>>();

  for (const { change, origin } of entries) {
    if (change.kind === 'setCells') {
      for (const { rowId, column, value } of change.cells) {
        const replacement = { value, origin };
        addReplacement({ cells: explicitCells, rowId, column, replacement });
      }
    }

    if (change.kind === 'mergeRows') {
      for (const { column, from } of change.values) {
        if (from === change.keep) continue;

        const value = dataset.rows[from]?.[column];
        if (value === undefined) continue;

        const replacement = { value, origin };
        const rowId = change.keep;
        addReplacement({ cells: filledCells, rowId, column, replacement });
      }
    }
  }

  return { explicitCells, filledCells };
}

function addReplacement({
  cells,
  rowId,
  column,
  replacement,
}: {
  cells: Map<RowId, Map<ColumnKey, Replacement>>;
  rowId: RowId;
  column: ColumnKey;
  replacement: Replacement;
}): void {
  const columns = cells.get(rowId) ?? new Map<ColumnKey, Replacement>();
  cells.set(rowId, columns);

  if (!columns.has(column)) columns.set(column, replacement);
}
