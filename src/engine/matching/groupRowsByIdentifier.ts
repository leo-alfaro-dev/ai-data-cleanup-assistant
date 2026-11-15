import type { Row, RowId } from '@/engine/dataset/dataset';
import { groupRowsByKey } from '@/engine/rows/groupRowsByKey';
import { toMatchKey } from '@/engine/values/toMatchKey';
import type { IdentifierGroup } from './identifierGroup';
import type { MatchColumn } from './matchColumn';
import { MAX_ROWS_PER_RECORD } from './maxRowsPerRecord';

/**
 * Sets of rows sharing a value in an identifier column, by column and then by first row. A value
 * on more than `MAX_ROWS_PER_RECORD` rows is a shared value, not one record, and is left out.
 */
export function groupRowsByIdentifier({
  rows,
  rowIds,
  identifierColumns,
}: {
  rows: readonly Row[];
  rowIds: readonly RowId[];
  identifierColumns: readonly MatchColumn[];
}): IdentifierGroup[] {
  return identifierColumns.flatMap(({ column, isPhone }) => {
    const toKey = (row: Row) =>
      toMatchKey({ value: row[column] ?? '', isPhone });

    return groupRowsByKey({ rows, rowIds, toKey }).flatMap((group) => {
      const [first] = group;
      const value = first === undefined ? null : toKey(rows[first] ?? []);
      const isOneRecord = group.length <= MAX_ROWS_PER_RECORD;

      return value !== null && isOneRecord
        ? [{ column, value, rows: group }]
        : [];
    });
  });
}
