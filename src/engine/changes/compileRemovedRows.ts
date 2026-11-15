import type { RowId } from '@/engine/dataset/dataset';
import type { Change } from './change';
import type { ChangeOrigin } from './changeOrigin';
import type { PlanEntry } from './planEntry';

export function compileRemovedRows(
  entries: readonly PlanEntry[]
): ReadonlyMap<RowId, ChangeOrigin> {
  const removedRows = new Map<RowId, ChangeOrigin>();

  for (const { change, origin } of entries) {
    for (const rowId of listRemovedRows(change)) {
      if (!removedRows.has(rowId)) removedRows.set(rowId, origin);
    }
  }

  return removedRows;
}

function listRemovedRows(change: Change): readonly RowId[] {
  switch (change.kind) {
    case 'removeRows':
      return change.rows;
    case 'mergeRows':
      return change.remove;
    case 'dropDuplicateRows':
      return change.groups.flatMap(withoutFirstRow);
    case 'trimWhitespace':
    case 'mapValues':
    case 'standardizeDates':
    case 'setCells':
      return [];
  }
}

function withoutFirstRow(group: readonly RowId[]): readonly RowId[] {
  const first = group.reduce(
    (smallest, rowId) => Math.min(smallest, rowId),
    Infinity
  );

  return group.filter((rowId) => rowId !== first);
}
