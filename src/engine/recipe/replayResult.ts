import type { Issue } from '@/engine/issues/issue';
import type { RecipeRule } from './recipe';

export type SkippedRule = {
  index: number;
  rule: RecipeRule;
  reason: 'missingColumn' | 'nothingToChange';
};

// Each applied rule is an issue whose suggestion is the rule, so it can be inspected and undone.
export type ReplayResult = {
  issues: readonly Issue[];
  skipped: readonly SkippedRule[];
  cellsChanged: number;
  rowsRemoved: number;
};
