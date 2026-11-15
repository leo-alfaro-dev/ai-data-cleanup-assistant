import type { Decision } from '@/engine/decisions/decision';
import type { Issue, IssueCategory, IssueId } from '@/engine/issues/issue';

export function listBulkRejectable({
  issues,
  decisions,
  category,
}: {
  issues: readonly Issue[];
  decisions: ReadonlyMap<IssueId, Decision>;
  category: IssueCategory;
}): readonly Issue[] {
  return issues.filter(
    (issue) => issue.category === category && !decisions.has(issue.id)
  );
}
