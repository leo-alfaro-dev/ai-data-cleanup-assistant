import type { Decision } from './decision';

// An edit is the same decision only while it holds the very same change.
export function isSameDecision({
  first,
  second,
}: {
  first: Decision | null;
  second: Decision | null;
}): boolean {
  if (first === null || second === null) return first === second;
  if (first.status === 'edited') {
    return second.status === 'edited' && first.change === second.change;
  }

  return first.status === second.status;
}
