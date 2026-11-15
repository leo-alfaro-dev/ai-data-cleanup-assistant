import { confidenceRank } from '@/engine/issues/confidenceRank';
import type { Issue, IssueId } from '@/engine/issues/issue';
import { ISSUE_CATEGORIES } from '@/engine/issues/issue';
import { memoizeLast } from '@/lib/memoizeLast';

// By category, then an issue the AI found plausible after the others, then the most certain
// first, then the issues that touch the most rows first, then by id.
export const sortIssues = memoizeLast(
  ({
    issues,
    plausibleIssueIds,
  }: {
    issues: readonly Issue[];
    plausibleIssueIds: ReadonlySet<IssueId>;
  }): readonly Issue[] =>
    [...issues].sort(
      (first, second) =>
        ISSUE_CATEGORIES.indexOf(first.category) -
          ISSUE_CATEGORIES.indexOf(second.category) ||
        Number(plausibleIssueIds.has(first.id)) -
          Number(plausibleIssueIds.has(second.id)) ||
        confidenceRank(first.confidence) - confidenceRank(second.confidence) ||
        second.rows.length - first.rows.length ||
        compareIds({ first: first.id, second: second.id })
    )
);

function compareIds({
  first,
  second,
}: {
  first: string;
  second: string;
}): number {
  if (first < second) return -1;

  return first > second ? 1 : 0;
}
