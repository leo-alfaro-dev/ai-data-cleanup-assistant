import type { Decision } from '@/engine/decisions/decision';
import { confidenceRank } from '@/engine/issues/confidenceRank';
import type {
  Confidence,
  Issue,
  IssueCategory,
  IssueId,
} from '@/engine/issues/issue';

/** The pending issues of a category that carry a suggestion at least as confident as the minimum. */
export function listBulkAcceptable({
  issues,
  decisions,
  category,
  minimumConfidence,
}: {
  issues: readonly Issue[];
  decisions: ReadonlyMap<IssueId, Decision>;
  category: IssueCategory;
  minimumConfidence: Confidence;
}): readonly Issue[] {
  const lowestRank = confidenceRank(minimumConfidence);

  return issues.filter(
    (issue) =>
      issue.category === category &&
      issue.suggestion !== null &&
      !decisions.has(issue.id) &&
      confidenceRank(issue.confidence) <= lowestRank
  );
}
