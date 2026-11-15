import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import type { Change } from '@/engine/changes/change';
import type { Issue } from './issue';

export type Coverage = {
  mappedValues: ReadonlyMap<ColumnKey, ReadonlySet<string>>;
  mergedRows: readonly ReadonlySet<RowId>[];
};

// What the suggestions of these issues would change: the values they map and the rows they merge.
export function listCoverage({
  issues,
  changeOf,
}: {
  issues: readonly Issue[];
  changeOf: (issue: Issue) => Change | null;
}): Coverage {
  const mappedValues = new Map<ColumnKey, Set<string>>();
  const mergedRows: ReadonlySet<RowId>[] = [];

  for (const issue of issues) {
    const suggestion = changeOf(issue);
    if (suggestion?.kind === 'mergeRows') {
      mergedRows.push(new Set([suggestion.keep, ...suggestion.remove]));
    }
    if (suggestion?.kind !== 'mapValues') continue;

    const values = mappedValues.get(suggestion.column) ?? new Set<string>();
    for (const { variants } of suggestion.groups) {
      for (const variant of variants) values.add(normalizeWhitespace(variant));
    }
    mappedValues.set(suggestion.column, values);
  }

  return { mappedValues, mergedRows };
}
