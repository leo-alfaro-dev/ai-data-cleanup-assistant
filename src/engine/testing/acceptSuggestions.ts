import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import type { Issue } from '@/engine/issues/issue';

export function acceptSuggestions(issues: readonly Issue[]): AcceptedChange[] {
  return issues.flatMap(({ id, suggestion }) =>
    suggestion === null ? [] : [{ issueId: id, change: suggestion }]
  );
}
