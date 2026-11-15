import type { Decision } from '@/engine/decisions/decision';
import type { Issue, IssueId } from '@/engine/issues/issue';
import { aiStore$ } from './aiStore';
import { analysisStore$ } from './analysisStore';
import { mergeIssues } from './mergeIssues';

// The issues as the page lists them right now, for code that is not a component.
export function readIssues(
  decisions: ReadonlyMap<IssueId, Decision>
): readonly Issue[] {
  const { phase } = analysisStore$.getState();

  return mergeIssues({
    checkIssues: phase.status === 'done' ? phase.result.issues : [],
    aiIssues: aiStore$.getState().issues,
    decisions,
  });
}
