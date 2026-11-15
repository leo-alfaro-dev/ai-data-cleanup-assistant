import type { Row, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';

/**
 * Groups of two or more rows that share a key, in order of first appearance. Each group
 * lists its rows in the order `rowIds` gives them. A row whose key is null is skipped;
 * `rowIds` defaults to every row.
 */
export function groupRowsByKey({
  rows,
  rowIds,
  toKey,
}: {
  rows: readonly Row[];
  rowIds?: Iterable<RowId>;
  toKey: (row: Row) => string | null;
}): RowId[][] {
  const seen = new Map<string, RowId | RowId[]>();

  for (const rowId of rowIds ?? listEveryRowId(rows.length)) {
    const row = rows[rowId];
    if (row === undefined) continue;

    const key = toKey(row);
    if (key === null) continue;

    const earlier = seen.get(key);
    if (earlier === undefined) seen.set(key, rowId);
    else if (typeof earlier === 'number') seen.set(key, [earlier, rowId]);
    else earlier.push(rowId);
  }

  const groups: RowId[][] = [];
  for (const entry of seen.values()) {
    if (typeof entry !== 'number') groups.push(entry);
  }

  return groups;
}

function* listEveryRowId(count: number): Generator<RowId> {
  for (let index = 0; index < count; index++) yield toRowId(index);
}
