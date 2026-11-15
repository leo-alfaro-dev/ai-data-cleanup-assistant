import type { CategoryScore } from './categoryScore';
import { toRatio } from './toRatio';

export function toCategoryScore({
  planted,
  claimed,
  correctClaims,
  found,
  suggested,
  rightSuggestions,
}: Omit<
  CategoryScore,
  'precision' | 'recall' | 'suggestionAccuracy'
>): CategoryScore {
  return {
    planted,
    claimed,
    correctClaims,
    found,
    precision: toRatio({ numerator: correctClaims, denominator: claimed }),
    recall: toRatio({ numerator: found, denominator: planted }),
    suggested,
    rightSuggestions,
    suggestionAccuracy: toRatio({
      numerator: rightSuggestions,
      denominator: suggested,
    }),
  };
}
