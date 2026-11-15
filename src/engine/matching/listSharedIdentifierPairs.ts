import type { Row, RowId } from '@/engine/dataset/dataset';
import { groupRowsByIdentifier } from './groupRowsByIdentifier';
import type { MatchColumn } from './matchColumn';

/** Every pair of rows that share a value in an identifier column, the lower row id first. */
export function* listSharedIdentifierPairs({
  rows,
  rowIds,
  identifierColumns,
}: {
  rows: readonly Row[];
  rowIds: readonly RowId[];
  identifierColumns: readonly MatchColumn[];
}): Generator<readonly [RowId, RowId]> {
  const groups = groupRowsByIdentifier({ rows, rowIds, identifierColumns });

  for (const { rows: group } of groups) {
    for (const [index, first] of group.entries()) {
      for (const second of group.slice(index + 1)) yield [first, second];
    }
  }
}
