import type { RowId } from '@/engine/dataset/dataset';
import type { Decision } from '@/engine/decisions/decision';
import type { IssueCategory, IssueId } from '@/engine/issues/issue';
import type { DecisionBatch } from './decisionBatch';
import type { ReviewStep } from './reviewStep';

export type ReviewState = {
  selectedIssueId: IssueId | null;
  categoryFilter: IssueCategory | null;
  decisions: ReadonlyMap<IssueId, Decision>;
  undoStack: readonly DecisionBatch[];
  redoStack: readonly DecisionBatch[];
  lastStep: ReviewStep | null;
  editingIssueId: IssueId | null;
  view: 'original' | 'cleaned';
  panel: 'issues' | 'data';
  isOnlyIssueRows: boolean;
  focusedRow: RowId | null;
};
