export type CategoryScore = {
  planted: number;
  claimed: number;
  correctClaims: number;
  found: number;
  precision: number | null;
  recall: number | null;
  suggested: number;
  rightSuggestions: number;
  suggestionAccuracy: number | null;
};
