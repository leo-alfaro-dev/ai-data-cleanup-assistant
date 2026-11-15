import type { ColumnKey, RowId } from '@/engine/dataset/dataset';

export function toCellKey({
  rowId,
  column,
}: {
  rowId: RowId;
  column: ColumnKey;
}): string {
  return `${rowId}:${column}`;
}
