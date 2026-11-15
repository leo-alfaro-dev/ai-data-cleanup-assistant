import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Change } from '@/engine/changes/change';
import type { Issue, IssueCategory } from '@/engine/issues/issue';
import type { IssueDetails } from '@/engine/issues/issueDetails';
import { toIssueId } from '@/engine/issues/toIssueId';

export function makeIssue({
  id,
  category = 'inconsistent',
  rows = [0],
  column = null,
  suggestion = null,
  details = { kind: 'blankRows' },
}: {
  id: string;
  category?: IssueCategory;
  rows?: readonly number[];
  column?: ColumnKey | null;
  suggestion?: Change | null;
  details?: IssueDetails;
}): Issue {
  return {
    id: toIssueId(id),
    category,
    source: 'check',
    confidence: 'high',
    rows: rows.map((row): RowId => toRowId(row)),
    column,
    suggestion,
    details,
  };
}
