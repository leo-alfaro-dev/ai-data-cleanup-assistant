import type { Issue, IssueCategory, IssueId } from '@/engine/issues/issue';
import { memoizeLast } from '@/lib/memoizeLast';
import { sortIssues } from '../sortIssues';
import { useIssues } from './useIssues';
import { usePlausibleIssueIds } from './usePlausibleIssueIds';
import { useCategoryFilter } from './reviewStore';

export function useVisibleIssues(): readonly Issue[] {
  return listVisibleIssues({
    issues: useIssues(),
    category: useCategoryFilter(),
    plausibleIssueIds: usePlausibleIssueIds(),
  });
}

const listVisibleIssues = memoizeLast(
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
