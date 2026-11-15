import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import type { Issue } from './issue';

export type Coverage = {
  mappedValues: ReadonlyMap<ColumnKey, ReadonlySet<string>>;
  mergedRows: readonly ReadonlySet<RowId>[];
};

// What the suggestions of these issues would change: the values they map and the rows they merge.
export function listCoverage(issues: readonly Issue[]): Coverage {
  const mappedValues = new Map<ColumnKey, Set<string>>();
  const mergedRows: ReadonlySet<RowId>[] = [];

  for (const { suggestion } of issues) {
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
