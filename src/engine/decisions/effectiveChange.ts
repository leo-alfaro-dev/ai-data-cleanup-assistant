import type { Change } from '@/engine/changes/change';
import type { Decision } from './decision';

/** The change that applies to an issue: the user's edit when there is one, else the suggestion. */
export function effectiveChange({
  suggestion,
  decision,
}: {
  suggestion: Change | null;
  decision: Decision | undefined;
}): Change | null {
  return decision?.status === 'edited' ? decision.change : suggestion;
}
