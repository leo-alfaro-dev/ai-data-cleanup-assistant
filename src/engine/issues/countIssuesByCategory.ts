import type { Issue, IssueCategory } from './issue';

export function countIssuesByCategory(
  issues: readonly Issue[]
): Record<IssueCategory, number> {
  const counts = { duplicate: 0, inconsistent: 0, missing: 0, suspicious: 0 };

  for (const { category } of issues) counts[category] += 1;

  return counts;
}
