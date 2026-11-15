import { z } from 'zod';
import { DATE_FORMATS } from '@/engine/values/dateFormat';

export const RECIPE_VERSION = 1;

// A column by its header text, so a rule finds it in a file whose columns are reordered. The
// occurrence tells apart columns that share a header, counting from 1.
const columnRef = z.object({
  header: z.string(),
  occurrence: z.number().int().min(1),
});

const valueGroup = z.object({
  canonical: z.string(),
  variants: z.array(z.string()),
});

export const recipeRule = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('trimWhitespace'), column: columnRef }),
  z.object({
    kind: z.literal('mapValues'),
    column: columnRef,
    groups: z.array(valueGroup),
  }),
  z.object({
    kind: z.literal('standardizeDates'),
    column: columnRef,
    format: z.enum(DATE_FORMATS),
  }),
  // The groups are found again in the file the recipe is replayed on.
  z.object({
    kind: z.literal('dropDuplicateRows'),
    mode: z.enum(['exact', 'normalized']),
  }),
]);

export const recipe = z.object({
  version: z.literal(RECIPE_VERSION),
  createdAt: z.string(),
  source: z.object({
    fileName: z.string(),
    rowCount: z.number().int().min(0),
    columns: z.array(z.string()),
  }),
  rules: z.array(recipeRule),
});

export type ColumnRef = z.infer<typeof columnRef>;

export type RecipeRule = z.infer<typeof recipeRule>;

export type Recipe = z.infer<typeof recipe>;
