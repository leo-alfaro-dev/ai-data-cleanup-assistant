import type { IssueCategory } from '@/engine/issues/issue';
import { ISSUE_CATEGORIES } from '@/engine/issues/issue';
import type { CategoryScore } from './categoryScore';
import { toRatio } from './toRatio';

export function pooledSuggestionAccuracy(
  scores: Record<IssueCategory, CategoryScore>
): number | null {
  const categories = ISSUE_CATEGORIES.map((category) => scores[category]);

  return toRatio({
    numerator: categories.reduce(
      (total, { rightSuggestions }) => total + rightSuggestions,
      0
    ),
    denominator: categories.reduce(
      (total, { suggested }) => total + suggested,
      0
    ),
  });
}
