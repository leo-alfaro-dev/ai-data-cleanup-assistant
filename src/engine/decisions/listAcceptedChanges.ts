import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import type { Issue, IssueId } from '@/engine/issues/issue';
import type { Decision } from './decision';
import { effectiveChange } from './effectiveChange';

export function listAcceptedChanges({
  issues,
  decisions,
}: {
  issues: readonly Issue[];
  decisions: ReadonlyMap<IssueId, Decision>;
}): AcceptedChange[] {
  return issues.flatMap(({ id, suggestion }) => {
    const decision = decisions.get(id);
    const isApplied =
      decision?.status === 'accepted' || decision?.status === 'edited';
    const change = effectiveChange({ suggestion, decision });

    return isApplied && change !== null ? [{ issueId: id, change }] : [];
  });
}
