import { toIssueId } from '@/engine/issues/toIssueId';
import { groupNormalizedDuplicateRows } from '@/engine/rows/groupNormalizedDuplicateRows';
import { listGroupedRows } from '@/engine/rows/listGroupedRows';
import type { Check } from './check';
import { toCheckId } from './toCheckId';

const id = toCheckId('normalized-duplicates');

export const findNormalizedDuplicates: Check = {
  id,
  category: 'duplicate',
  find({ dataset }) {
    const groups = groupNormalizedDuplicateRows(dataset.rows);
    if (groups.length === 0) return [];

    return [
      {
        id: toIssueId(id),
        category: 'duplicate',
        source: 'check',
        confidence: 'high',
        rows: listGroupedRows(groups),
        column: null,
        suggestion: { kind: 'dropDuplicateRows', mode: 'normalized', groups },
        details: { kind: 'normalizedDuplicates', groups },
      },
    ];
  },
};
