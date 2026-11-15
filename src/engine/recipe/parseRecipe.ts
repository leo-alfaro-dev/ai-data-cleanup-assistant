import { readFormulaTrigger } from '@/engine/values/readFormulaTrigger';
import { tryCatch } from '@/lib/tryCatch';
import type { Recipe } from './recipe';
import { recipe, RECIPE_VERSION } from './recipe';

export const MAX_RECIPE_BYTES = 1024 * 1024;

export type RecipeRejection =
  'notJson' | 'unsupportedVersion' | 'invalidRecipe' | 'unsafeValue';

export function parseRecipe(
  text: string
): { ok: true; recipe: Recipe } | { ok: false; reason: RecipeRejection } {
  const { result: json, error } = tryCatch(() => JSON.parse(text));
  if (error) return { ok: false, reason: 'notJson' };

  const parsed = recipe.safeParse(json);
  if (!parsed.success) {
    const reason = hasOtherVersion(json)
      ? 'unsupportedVersion'
      : 'invalidRecipe';

    return { ok: false, reason };
  }
  if (hasFormulaLikeValue(parsed.data)) {
    return { ok: false, reason: 'unsafeValue' };
  }

  return { ok: true, recipe: parsed.data };
}

// A recipe is applied without review, so a value that spreadsheets run as a formula is refused.
function hasFormulaLikeValue({ rules }: Recipe): boolean {
  return rules.some(
    (rule) =>
      rule.kind === 'mapValues' &&
      rule.groups.some(
        ({ canonical }) => readFormulaTrigger(canonical) !== null
      )
  );
}

function hasOtherVersion(json: unknown): boolean {
  return (
    typeof json === 'object' &&
    json !== null &&
    'version' in json &&
    typeof json.version === 'number' &&
    json.version !== RECIPE_VERSION
  );
}
