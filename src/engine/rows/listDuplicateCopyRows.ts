import type { Row, RowId } from '@/engine/dataset/dataset';
import { groupExactDuplicateRows } from './groupExactDuplicateRows';
import { groupNormalizedDuplicateRows } from './groupNormalizedDuplicateRows';
import { listCopyRows } from './listCopyRows';

/** The rows the exact and normalized duplicate checks remove: every row but the first of each group. */
export function listDuplicateCopyRows(rows: readonly Row[]): Set<RowId> {
  const copies = listCopyRows(groupExactDuplicateRows(rows));
  for (const rowId of listCopyRows(groupNormalizedDuplicateRows(rows))) {
    copies.add(rowId);
  }

  return copies;
}
