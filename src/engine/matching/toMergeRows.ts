import type { MergeChoice, MergeRows } from '@/engine/changes/change';
import type { Row, RowId } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { isBlank } from '@/engine/values/isBlank';
import { isPlaceholder } from '@/engine/values/isPlaceholder';

/**
 * Keeps one row and removes the others, filling each blank or placeholder cell of the kept row
 * with the first later row's value for it. A placeholder is never copied in, and no value is
 * ever made up.
 */
export function toMergeRows({
  rows,
  keep,
  remove,
}: {
  rows: readonly Row[];
  keep: RowId;
  remove: readonly RowId[];
}): MergeRows {
  const values: MergeChoice[] = [];

  for (const [index, cell] of (rows[keep] ?? []).entries()) {
    if (isUsable(cell)) continue;

    const from = remove.find((rowId) => isUsable(rows[rowId]?.[index] ?? ''));
    if (from !== undefined) values.push({ column: toColumnKey(index), from });
  }

  return { kind: 'mergeRows', keep, remove, values };
}

function isUsable(value: string): boolean {
  return !isBlank(value) && !isPlaceholder(value);
}
