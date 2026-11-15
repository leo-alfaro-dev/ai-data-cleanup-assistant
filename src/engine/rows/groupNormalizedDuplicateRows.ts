import type { Row, RowId } from '@/engine/dataset/dataset';
import { toComparisonKey } from '@/engine/values/toComparisonKey';
import { memoizeByReference } from '@/lib/memoizeByReference';
import { groupExactDuplicateRows } from './groupExactDuplicateRows';
import { groupRowsByKey } from './groupRowsByKey';
import { isBlankRow } from './isBlankRow';
import { listCopyRows } from './listCopyRows';
import { listRowsWithout } from './listRowsWithout';
import { toRowKey } from './toRowKey';

// Memoized for the same reason as `groupExactDuplicateRows`.
export const groupNormalizedDuplicateRows = memoizeByReference(
  (rows: readonly Row[]): readonly (readonly RowId[])[] => {
    const exactCopies = listCopyRows(groupExactDuplicateRows(rows));

    return groupRowsByKey({
      rows,
      rowIds: listRowsWithout({ count: rows.length, excluded: exactCopies }),
      toKey: (row) =>
        isBlankRow(row) ? null : toRowKey({ row, toCellKey: toComparisonKey }),
    });
  }
);
