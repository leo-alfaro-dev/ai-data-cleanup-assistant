import type { ColumnKey, Row, RowId } from '@/engine/dataset/dataset';
import { listColumnKeys } from './listColumnKeys';

/** The match key of each name column for each row id, one array per column. */
export function listNameKeys({
  rows,
  rowIds,
  nameColumns,
}: {
  rows: readonly Row[];
  rowIds: readonly RowId[];
  nameColumns: readonly ColumnKey[];
}): string[][] {
  return nameColumns.map((column) =>
    listColumnKeys({
      rows,
      rowIds,
      matchColumn: { column, isPhone: false },
      ignoredKeys: NO_KEYS,
    })
  );
}

const NO_KEYS: ReadonlySet<string> = new Set();
