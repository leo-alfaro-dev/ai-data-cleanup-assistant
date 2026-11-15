import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import { compareAcceptedChanges } from '@/engine/changes/compareAcceptedChanges';
import type { Column } from '@/engine/dataset/dataset';
import type { Recipe, RecipeRule } from './recipe';
import { RECIPE_VERSION } from './recipe';
import { toRecipeRule } from './toRecipeRule';

/** The accepted rules, in the order they win conflicts. Changes about particular rows stay in the change log. */
export function buildRecipe({
  accepted,
  columns,
  rowCount,
  fileName,
  createdAt,
}: {
  accepted: readonly AcceptedChange[];
  columns: readonly Column[];
  rowCount: number;
  fileName: string;
  createdAt: string;
}): Recipe {
  const rules = [...accepted]
    .sort(compareAcceptedChanges)
    .map(({ change }) => toRecipeRule({ change, columns }))
    .filter((rule): rule is RecipeRule => rule !== null);

  return {
    version: RECIPE_VERSION,
    createdAt,
    source: {
      fileName,
      rowCount,
      columns: columns.map(({ header }) => header),
    },
    rules,
  };
}
