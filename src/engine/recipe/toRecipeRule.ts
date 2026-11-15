import type { Change } from '@/engine/changes/change';
import type { Column } from '@/engine/dataset/dataset';
import { toColumnRef } from './toColumnRef';
import type { RecipeRule } from './recipe';

/** The rule a change is, or null for a change that is about particular rows. */
export function toRecipeRule({
  change,
  columns,
}: {
  change: Change;
  columns: readonly Column[];
}): RecipeRule | null {
  switch (change.kind) {
    case 'trimWhitespace': {
      const column = toColumnRef({ columns, key: change.column });

      return column && { kind: 'trimWhitespace', column };
    }
    case 'mapValues': {
      const column = toColumnRef({ columns, key: change.column });

      const groups = change.groups.map(({ canonical, variants }) => ({
        canonical,
        variants: [...variants],
      }));

      return column && { kind: 'mapValues', column, groups };
    }
    case 'standardizeDates': {
      const column = toColumnRef({ columns, key: change.column });

      return (
        column && { kind: 'standardizeDates', column, format: change.format }
      );
    }
    case 'dropDuplicateRows':
      return { kind: 'dropDuplicateRows', mode: change.mode };
    case 'setCells':
    case 'mergeRows':
    case 'removeRows':
      return null;
  }
}
