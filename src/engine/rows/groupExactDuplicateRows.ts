import type { Row, RowId } from '@/engine/dataset/dataset';
import { memoizeByReference } from '@/lib/memoizeByReference';
import { groupRowsByKey } from './groupRowsByKey';
import { isBlankRow } from './isBlankRow';
import { toRowKey } from './toRowKey';

// Memoized: several checks and the candidate search read the groups of the same rows.
export const groupExactDuplicateRows = memoizeByReference(
  (rows: readonly Row[]): readonly (readonly RowId[])[] =>
    groupRowsByKey({
      rows,
      toKey: (row) => (isBlankRow(row) ? null : toRowKey({ row })),
    })
);
