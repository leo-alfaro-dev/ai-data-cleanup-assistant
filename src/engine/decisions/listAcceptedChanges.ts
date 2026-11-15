import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import type { Issue, IssueId } from '@/engine/issues/issue';
import type { Decision } from './decision';

export function listAcceptedChanges({
  issues,
  decisions,
}: {
  issues: readonly Issue[];
  decisions: ReadonlyMap<IssueId, Decision>;
}): AcceptedChange[] {
  return issues.flatMap(({ id, suggestion }) => {
    const isAccepted = decisions.get(id)?.status === 'accepted';

    return isAccepted && suggestion !== null
      ? [{ issueId: id, change: suggestion }]
      : [];
  });
}
