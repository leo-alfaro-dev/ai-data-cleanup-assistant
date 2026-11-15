import type { RowId } from '@/engine/dataset/dataset';
import { useIsOnlyIssueRows } from './reviewStore';
import { useSelectedIssue } from './useSelectedIssue';

// The rows the grid lists: those of the selected issue when asked and it has any, otherwise null
// for all of them.
export function useGridRowIds(): readonly RowId[] | null {
  const isOnlyIssueRows = useIsOnlyIssueRows();
  const issue = useSelectedIssue();
  const hasRows = issue !== undefined && issue.rows.length > 0;

  return isOnlyIssueRows && hasRows ? issue.rows : null;
}
