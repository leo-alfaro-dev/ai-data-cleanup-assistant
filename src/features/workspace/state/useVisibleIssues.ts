import type { Issue } from '@/engine/issues/issue';
import { listVisibleIssues } from './listVisibleIssues';
import { useCategoryFilter } from './reviewStore';
import { useIssues } from './useIssues';
import { usePlausibleIssueIds } from './usePlausibleIssueIds';

export function useVisibleIssues(): readonly Issue[] {
  return listVisibleIssues({
    issues: useIssues(),
    category: useCategoryFilter(),
    plausibleIssueIds: usePlausibleIssueIds(),
  });
}
