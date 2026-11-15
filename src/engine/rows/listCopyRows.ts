import type { RowId } from '@/engine/dataset/dataset';

export function listCopyRows(
  groups: readonly (readonly RowId[])[]
): Set<RowId> {
  const copies = new Set<RowId>();
  for (const group of groups) {
    for (const rowId of group.slice(1)) copies.add(rowId);
  }

  return copies;
}
