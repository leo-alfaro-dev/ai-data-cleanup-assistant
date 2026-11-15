import type { Issue } from '@/engine/issues/issue';
import { ISSUE_CATEGORIES } from '@/engine/issues/issue';
import { memoizeByReference } from '@/lib/memoizeByReference';

// By category, then the issues that touch the most rows first, then by id.
export const sortIssues = memoizeByReference(
  (issues: readonly Issue[]): readonly Issue[] =>
    [...issues].sort(
      (first, second) =>
        ISSUE_CATEGORIES.indexOf(first.category) -
          ISSUE_CATEGORIES.indexOf(second.category) ||
        second.rows.length - first.rows.length ||
        compareIds({ first: first.id, second: second.id })
    )
);

function compareIds({
  first,
  second,
}: {
  first: string;
  second: string;
}): number {
  if (first < second) return -1;

  return first > second ? 1 : 0;
}
