import type { RowId } from '@/engine/dataset/dataset';

// The grid lists every row by its id, or only the given rows when it is filtered.
export function toGridIndex({
  rowId,
  gridRowIds,
}: {
  rowId: RowId;
  gridRowIds: readonly RowId[] | null;
}): number {
  return gridRowIds ? gridRowIds.indexOf(rowId) : rowId;
}
