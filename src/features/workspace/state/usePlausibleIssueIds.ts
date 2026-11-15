import type { IssueId } from '@/engine/issues/issue';
import { memoizeLast } from '@/lib/memoizeLast';
import { useAiNotes } from './aiStore';
import { listPlausibleIssueIds } from './listPlausibleIssueIds';
import { useIssues } from './useIssues';

const plausibleIds = memoizeLast(listPlausibleIssueIds);

export function usePlausibleIssueIds(): ReadonlySet<IssueId> {
  return plausibleIds({ issues: useIssues(), notes: useAiNotes() });
}
