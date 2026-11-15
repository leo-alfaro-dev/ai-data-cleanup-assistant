import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import type { Change } from '@/engine/changes/change';
import { toIssueId } from '@/engine/issues/toIssueId';

export function accept({
  issue,
  change,
}: {
  issue: string;
  change: Change;
}): AcceptedChange {
  return { issueId: toIssueId(issue), change };
}
