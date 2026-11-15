import type { Issue } from '@/engine/issues/issue';
import { aiStore$ } from './aiStore';
import { listVisibleIssues } from './listVisibleIssues';
import { readIssues } from './readIssues';
import { readPlausibleIssueIds } from './readPlausibleIssueIds';
import type { ReviewState } from './reviewState';

// The issues as the list shows them right now, for code that is not a component.
export function readVisibleIssues(
  state: Pick<ReviewState, 'decisions' | 'categoryFilter'>
): readonly Issue[] {
  const issues = readIssues(state.decisions);

  return listVisibleIssues({
    issues,
    category: state.categoryFilter,
    plausibleIssueIds: readPlausibleIssueIds({
      issues,
      notes: aiStore$.getState().notes,
    }),
  });
}
