import type { IssueId } from '@/engine/issues/issue';
import { useAiNotes } from './aiStore';
import { readPlausibleIssueIds } from './readPlausibleIssueIds';
import { useIssues } from './useIssues';

export function usePlausibleIssueIds(): ReadonlySet<IssueId> {
  return readPlausibleIssueIds({ issues: useIssues(), notes: useAiNotes() });
}
