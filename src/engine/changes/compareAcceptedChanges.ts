import type { AcceptedChange } from './acceptedChange';

/** The order in which accepted changes win a conflict: by issue id, compared as text. */
export function compareAcceptedChanges(
  first: AcceptedChange,
  second: AcceptedChange
): number {
  if (first.issueId < second.issueId) return -1;
  if (first.issueId > second.issueId) return 1;

  return 0;
}
