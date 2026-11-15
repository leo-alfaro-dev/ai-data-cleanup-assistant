import type { RowId } from '@/engine/dataset/dataset';
import type { Issue } from '@/engine/issues/issue';

// The sets of rows that stand for one record, for the issues that report duplicates.
export function listIssueGroups(issue: Issue): readonly (readonly RowId[])[] {
  switch (issue.details.kind) {
    case 'exactDuplicates':
    case 'normalizedDuplicates':
      return issue.details.groups;
    case 'sharedIdentifiers':
      return [issue.rows];
    default:
      return [];
  }
}
