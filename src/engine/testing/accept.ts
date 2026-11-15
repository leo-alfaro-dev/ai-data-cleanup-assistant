import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import type { Change } from '@/engine/changes/change';
import type { IssueId } from '@/engine/issues/issue';

export function accept({
  issue,
  change,
}: {
  issue: string;
  change: Change;
}): AcceptedChange {
  return { issueId: issue as IssueId, change };
}
