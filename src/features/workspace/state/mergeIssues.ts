import type { Decision } from '@/engine/decisions/decision';
import { effectiveChange } from '@/engine/decisions/effectiveChange';
import type { Issue, IssueId } from '@/engine/issues/issue';
import { mergeAiIssues } from '@/engine/issues/mergeAiIssues';
import { memoizeLast } from '@/lib/memoizeLast';

// The check issues and the AI issues of a run as the page lists them. Shared by every reader, and
// the same list until one of its inputs changes.
export const mergeIssues = memoizeLast(
  ({
    checkIssues,
    aiIssues,
    recipeIssues,
    decisions,
  }: {
    checkIssues: readonly Issue[];
    aiIssues: readonly Issue[];
    recipeIssues: readonly Issue[];
    decisions: ReadonlyMap<IssueId, Decision>;
  }): readonly Issue[] =>
    mergeAiIssues({
      checkIssues,
      aiIssues: [...aiIssues, ...recipeIssues],
      isDecided: (issueId) => decisions.has(issueId),
      isRejected: (issueId) => decisions.get(issueId)?.status === 'rejected',
      changeOf: ({ id, suggestion }) =>
        effectiveChange({ suggestion, decision: decisions.get(id) }),
    })
);
