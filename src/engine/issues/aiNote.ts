import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import type { Confidence, IssueId } from './issue';

// What the AI said about one row that a check flagged. The check issue stays as the check made it.
export type AiNote = {
  issueId: IssueId;
  rowId: RowId;
  isSuspicious: boolean;
  column: ColumnKey | null;
  // The model's own words.
  reason: string;
  confidence: Confidence;
  // Shown, never applied: the check issue keeps its own suggestion.
  suggestedValue: string | null;
};
