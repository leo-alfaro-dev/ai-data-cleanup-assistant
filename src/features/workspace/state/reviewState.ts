import type { RowId } from '@/engine/dataset/dataset';
import type { Decision } from '@/engine/decisions/decision';
import type { IssueCategory, IssueId } from '@/engine/issues/issue';

export type ReviewState = {
  selectedIssueId: IssueId | null;
  categoryFilter: IssueCategory | null;
  decisions: ReadonlyMap<IssueId, Decision>;
  view: 'original' | 'cleaned';
  panel: 'issues' | 'data';
  isOnlyIssueRows: boolean;
  focusedRow: RowId | null;
};
