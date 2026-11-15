import type { Issue } from '@/engine/issues/issue';
import { memoizeLast } from '@/lib/memoizeLast';
import { useIssues } from './analysisStore';
import { useSelectedIssueId } from './reviewStore';

export function useSelectedIssue(): Issue | undefined {
  return findIssue({ issues: useIssues(), issueId: useSelectedIssueId() });
}

const findIssue = memoizeLast(
  ({
    issues,
    issueId,
  }: {
    issues: readonly Issue[];
    issueId: Issue['id'] | null;
  }): Issue | undefined => issues.find(({ id }) => id === issueId)
);
