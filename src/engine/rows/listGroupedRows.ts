import type { RowId } from '@/engine/dataset/dataset';

export function listGroupedRows(
  groups: readonly (readonly RowId[])[]
): RowId[] {
  return groups.flat().sort((first, second) => first - second);
}
