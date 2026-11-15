import type { Change } from '@/engine/changes/change';
import { isClearingMapping } from '@/engine/changes/isClearingMapping';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import { listGroupedRows } from '@/engine/rows/listGroupedRows';

export function toReplayIssue({
  index,
  change,
}: {
  index: number;
  change: Change;
}): Issue {
  const isDuplicates = change.kind === 'dropDuplicateRows';
  const isClearing = change.kind === 'mapValues' && isClearingMapping(change);

  return {
    // Padded, so ids compared as text keep the order of the rules.
    id: toIssueId(`recipe:${String(index).padStart(4, '0')}`),
    category: (() => {
      if (isDuplicates) return 'duplicate';

      return isClearing ? 'missing' : 'inconsistent';
    })(),
    source: 'recipe',
    confidence: 'certain',
    rows: isDuplicates ? listGroupedRows(change.groups) : [],
    column: 'column' in change ? change.column : null,
    suggestion: change,
    details: { kind: 'recipeRule' },
  };
}
