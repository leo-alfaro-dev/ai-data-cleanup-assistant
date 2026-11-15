import type { RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';

export function* listRowsWithout({
  count,
  excluded,
}: {
  count: number;
  excluded: ReadonlySet<RowId>;
}): Generator<RowId> {
  for (let index = 0; index < count; index++) {
    const rowId = toRowId(index);
    if (!excluded.has(rowId)) yield rowId;
  }
}
