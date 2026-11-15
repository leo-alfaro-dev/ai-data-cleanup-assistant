import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import { connectIdentifierGroups } from '@/engine/matching/connectIdentifierGroups';
import { groupRowsByIdentifier } from '@/engine/matching/groupRowsByIdentifier';
import { listIdentifierColumns } from '@/engine/matching/listIdentifierColumns';
import { hasConflictingNames } from '@/engine/matching/hasConflictingNames';
import { listNameColumns } from '@/engine/matching/listNameColumns';
import { listNameKeys } from '@/engine/matching/listNameKeys';
import { toMergeRows } from '@/engine/matching/toMergeRows';
import { listDuplicateCopyRows } from '@/engine/rows/listDuplicateCopyRows';
import { listRowsWithout } from '@/engine/rows/listRowsWithout';
import type { Check } from './check';
import { toCheckId } from './toCheckId';

const id = toCheckId('shared-identifiers');

export const findSharedIdentifiers: Check = {
  id,
  category: 'duplicate',
  find({ dataset, profile }) {
    const { rows } = dataset;
    const rowIds = [
      ...listRowsWithout({
        count: rows.length,
        excluded: listDuplicateCopyRows(rows),
      }),
    ];
    const identifierColumns = listIdentifierColumns({
      dataset,
      profile,
      rowIds,
    });
    if (identifierColumns.length === 0) return [];

    const groups = groupRowsByIdentifier({ rows, rowIds, identifierColumns });
    const nameKeys = listNameKeys({
      rows,
      rowIds,
      nameColumns: listNameColumns({ dataset, profile }),
    });

    return connectIdentifierGroups(groups).map(
      ({ keep, remove, links }): Issue => {
        // Another name on a shared phone or email may be a household or a switchboard, not one
        // person entered twice, so no merge is suggested.
        const isConflict = hasConflictingNames({ nameKeys, keep, remove });

        return {
          id: toIssueId(`${id}:${keep}`),
          category: 'duplicate',
          source: 'check',
          confidence: isConflict ? 'medium' : 'high',
          rows: [keep, ...remove],
          column: null,
          suggestion: isConflict ? null : toMergeRows({ rows, keep, remove }),
          details: {
            kind: 'sharedIdentifiers',
            links,
            hasConflictingNames: isConflict,
          },
        };
      }
    );
  },
};
