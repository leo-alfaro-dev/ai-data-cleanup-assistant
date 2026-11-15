import type { Decision } from '@/engine/decisions/decision';
import type { Issue, IssueId } from '@/engine/issues/issue';
import { readIssues } from './readIssues';

export function readIssue({
  issueId,
  decisions,
}: {
  issueId: IssueId | null;
  decisions: ReadonlyMap<IssueId, Decision>;
}): Issue | undefined {
  if (issueId === null) return undefined;

  return readIssues(decisions).find((issue) => issue.id === issueId);
}
