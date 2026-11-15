import type { Issue, IssueId } from '@/engine/issues/issue';
import { analysisStore$ } from './analysisStore';

export function readIssue(issueId: IssueId | null): Issue | undefined {
  const { phase } = analysisStore$.getState();
  if (issueId === null || phase.status !== 'done') return undefined;

  return phase.result.issues.find((issue) => issue.id === issueId);
}
