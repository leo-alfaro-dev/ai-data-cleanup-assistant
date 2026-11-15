import { toIssueId } from '@/engine/issues/toIssueId';
import { groupExactDuplicateRows } from '@/engine/rows/groupExactDuplicateRows';
import { listGroupedRows } from '@/engine/rows/listGroupedRows';
import type { Check } from './check';
import { toCheckId } from './toCheckId';

const id = toCheckId('exact-duplicates');

export const findExactDuplicates: Check = {
  id,
  category: 'duplicate',
  find({ dataset }) {
    const groups = groupExactDuplicateRows(dataset.rows);
    if (groups.length === 0) return [];

    return [
      {
        id: toIssueId(id),
        category: 'duplicate',
        source: 'check',
        confidence: 'certain',
        rows: listGroupedRows(groups),
        column: null,
        suggestion: { kind: 'dropDuplicateRows', mode: 'exact', groups },
        details: { kind: 'exactDuplicates', groups },
      },
    ];
  },
};
