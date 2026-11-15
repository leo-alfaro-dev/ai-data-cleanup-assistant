import type { Change } from '@/engine/changes/change';
import type { Dataset } from '@/engine/dataset/dataset';
import { groupExactDuplicateRows } from '@/engine/rows/groupExactDuplicateRows';
import { groupNormalizedDuplicateRows } from '@/engine/rows/groupNormalizedDuplicateRows';
import { findColumnByRef } from './findColumnByRef';
import type { RecipeRule } from './recipe';

/** The change a rule makes on this file, or null when the file lacks the column it names. */
export function toReplayChange({
  rule,
  dataset,
}: {
  rule: RecipeRule;
  dataset: Dataset;
}): Change | null {
  if (rule.kind === 'dropDuplicateRows') {
    const group =
      rule.mode === 'exact'
        ? groupExactDuplicateRows
        : groupNormalizedDuplicateRows;

    return {
      kind: 'dropDuplicateRows',
      mode: rule.mode,
      groups: group(dataset.rows),
    };
  }

  const column = findColumnByRef({
    columns: dataset.columns,
    ref: rule.column,
  });
  if (column === null) return null;

  switch (rule.kind) {
    case 'trimWhitespace':
      return { kind: 'trimWhitespace', column };
    case 'mapValues':
      return { kind: 'mapValues', column, groups: rule.groups };
    case 'standardizeDates':
      return { kind: 'standardizeDates', column, format: rule.format };
  }
}
