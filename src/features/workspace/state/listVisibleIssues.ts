import type { Issue, IssueCategory, IssueId } from '@/engine/issues/issue';
import { memoizeLast } from '@/lib/memoizeLast';
import { sortIssues } from '../sortIssues';

// The issues in the order the list shows them, narrowed to the category filter.
export const listVisibleIssues = memoizeLast(
  ({
    issues,
    category,
    plausibleIssueIds,
  }: {
    issues: readonly Issue[];
    category: IssueCategory | null;
    plausibleIssueIds: ReadonlySet<IssueId>;
  }): readonly Issue[] => {
    const sorted = sortIssues({ issues, plausibleIssueIds });

    return category === null
      ? sorted
      : sorted.filter((issue) => issue.category === category);
  }
);
