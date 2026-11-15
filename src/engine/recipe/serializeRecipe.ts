import type { Recipe } from './recipe';

export function serializeRecipe(recipe: Recipe): string {
  return `${JSON.stringify(recipe, null, 2)}\n`;
}
