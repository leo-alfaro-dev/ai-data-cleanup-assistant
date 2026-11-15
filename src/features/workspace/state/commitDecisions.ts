import type { Decision } from '@/engine/decisions/decision';
import { isSameDecision } from '@/engine/decisions/isSameDecision';
import type { IssueId } from '@/engine/issues/issue';
import { applyBatch } from './applyBatch';
import type { DecisionBatch } from './decisionBatch';
import type { ReviewState } from './reviewState';

/**
 * Applies decisions as one undo step and clears redo. A null value removes the decision.
 * Issues whose decision would not change are left out; nothing changes when none would.
 */
export function commitDecisions({
  state,
  changes,
}: {
  state: ReviewState;
  changes: ReadonlyMap<IssueId, Decision | null>;
}): ReviewState {
  const batch: DecisionBatch = [...changes]
    .map(([issueId, after]) => ({
      issueId,
      before: state.decisions.get(issueId) ?? null,
      after,
    }))
    .filter(
      ({ before, after }) => !isSameDecision({ first: before, second: after })
    );
  const [first] = batch;
  if (!first) return state;

  return {
    ...state,
    decisions: applyBatch({ decisions: state.decisions, batch, side: 'after' }),
    undoStack: [...state.undoStack, batch],
    redoStack: [],
    lastStep: {
      kind: 'decided',
      status: first.after?.status ?? 'removed',
      count: batch.length,
      issueId: first.issueId,
    },
  };
}
