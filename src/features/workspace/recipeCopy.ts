import type { Change } from '@/engine/changes/change';
import { isClearingMapping } from '@/engine/changes/isClearingMapping';
import { isRule } from '@/engine/changes/isRule';
import type { RecipeRejection } from '@/engine/recipe/parseRecipe';
import type { RecipeRule } from '@/engine/recipe/recipe';
import type { SkippedRule } from '@/engine/recipe/replayResult';
import { quote } from '@/lib/quote';

type RuleKindDescription =
  | { kind: 'trimWhitespace' | 'standardizeDates'; columnName: string }
  | { kind: 'mapValues'; columnName: string; isClearing: boolean }
  | { kind: 'dropDuplicateRows'; mode: 'exact' | 'normalized' };

function describeRuleKind(rule: RuleKindDescription): string {
  switch (rule.kind) {
    case 'trimWhitespace':
      return `Extra spaces in ${rule.columnName}`;
    case 'mapValues':
      return rule.isClearing
        ? `Placeholders in ${rule.columnName}`
        : `Spellings in ${rule.columnName}`;
    case 'standardizeDates':
      return `Date format in ${rule.columnName}`;
    case 'dropDuplicateRows':
      return rule.mode === 'normalized'
        ? 'Duplicate rows that differ in spacing or case'
        : 'Exact duplicate rows';
  }
}

/** The title of the issue a replay makes of a rule. */
export function describeRecipeChange({
  change,
  columnName,
}: {
  change: Change | null;
  columnName: string;
}): string {
  if (!change || !isRule(change)) return 'Rule from the recipe';
  if (change.kind === 'dropDuplicateRows') {
    return describeRuleKind({ kind: change.kind, mode: change.mode });
  }
  if (change.kind === 'mapValues') {
    return describeRuleKind({
      kind: change.kind,
      columnName,
      isClearing: isClearingMapping(change),
    });
  }

  return describeRuleKind({ kind: change.kind, columnName });
}

/** The same title, for a rule of a recipe in the report. */
export function describeRecipeRule(rule: RecipeRule): string {
  if (rule.kind === 'dropDuplicateRows') {
    return describeRuleKind({ kind: rule.kind, mode: rule.mode });
  }

  const columnName = quote(rule.column.header);
  if (rule.kind === 'mapValues') {
    return describeRuleKind({
      kind: rule.kind,
      columnName,
      isClearing: isClearingMapping(rule),
    });
  }

  return describeRuleKind({ kind: rule.kind, columnName });
}

export const skippedRuleCopy: Record<SkippedRule['reason'], string> = {
  missingColumn: 'The column is not in this file.',
  nothingToChange: 'It finds nothing to change in this file.',
};

export const recipeRejectionCopy: Record<
  RecipeRejection | 'unreadable' | 'tooLarge',
  string
> = {
  notJson: 'The file is not JSON, so it is not a recipe.',
  invalidRecipe: 'The file is JSON but not a recipe this app can read.',
  unsupportedVersion: 'This recipe was written for another version of the app.',
  unsafeValue:
    'The recipe would write a value that a spreadsheet runs as a formula, so it was refused.',
  tooLarge: 'The file is larger than a recipe should be.',
  unreadable: 'The file could not be read.',
};
