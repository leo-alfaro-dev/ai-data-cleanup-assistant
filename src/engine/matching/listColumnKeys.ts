import type { Row, RowId } from '@/engine/dataset/dataset';
import { toMatchKey } from '@/engine/values/toMatchKey';
import type { MatchColumn } from './matchColumn';

/**
 * The match key of one column for each row id, indexed by row id. A row not in `rowIds`, a cell
 * with no key and a key in `ignoredKeys` hold the empty string, which no key ever is.
 */
export function listColumnKeys({
  rows,
  rowIds,
  matchColumn,
  ignoredKeys,
}: {
  rows: readonly Row[];
  rowIds: readonly RowId[];
  matchColumn: MatchColumn;
  ignoredKeys: ReadonlySet<string>;
}): string[] {
  const { column, isPhone } = matchColumn;
  const keys = rows.map(() => '');

  for (const rowId of rowIds) {
    const value = rows[rowId]?.[column] ?? '';
    const key = toMatchKey({ value, isPhone });
    if (key !== null && !ignoredKeys.has(key)) keys[rowId] = key;
  }

  return keys;
}
