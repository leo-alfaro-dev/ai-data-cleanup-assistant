import type { Decision } from '@/engine/decisions/decision';
import type { IssueId } from '@/engine/issues/issue';
import type { DecisionBatch } from './decisionBatch';

export function applyBatch({
  decisions,
  batch,
  side,
}: {
  decisions: ReadonlyMap<IssueId, Decision>;
  batch: DecisionBatch;
  side: 'before' | 'after';
}): ReadonlyMap<IssueId, Decision> {
  const next = new Map(decisions);
  for (const entry of batch) {
    const decision = entry[side];
    if (decision === null) next.delete(entry.issueId);
    else next.set(entry.issueId, decision);
  }

  return next;
}
