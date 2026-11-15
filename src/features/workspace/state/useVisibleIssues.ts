import type { Issue, IssueCategory } from '@/engine/issues/issue';
import { memoizeLast } from '@/lib/memoizeLast';
import { sortIssues } from '../sortIssues';
import { useIssues } from './analysisStore';
import { useCategoryFilter } from './reviewStore';

export function useVisibleIssues(): readonly Issue[] {
  return listVisibleIssues({
    issues: useIssues(),
    category: useCategoryFilter(),
  });
}

const listVisibleIssues = memoizeLast(
  ({
    issues,
    category,
  }: {
    issues: readonly Issue[];
    category: IssueCategory | null;
  }): readonly Issue[] => {
    const sorted = sortIssues(issues);

    return category === null
      ? sorted
      : sorted.filter((issue) => issue.category === category);
  }
);
