import type { Decision } from '@/engine/decisions/decision';
import type { IssueId } from '@/engine/issues/issue';

// One undo step: every issue a single action decided, with its decision before and after.
export type DecisionBatch = readonly {
  issueId: IssueId;
  before: Decision | null;
  after: Decision | null;
}[];
