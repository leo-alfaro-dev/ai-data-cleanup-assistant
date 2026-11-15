import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import type { DateFormat } from '@/engine/values/dateFormat';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import type { Change, DuplicateMode } from '@/engine/changes/change';
import type { Issue } from './issue';

export type Coverage = {
  mappedValues: ReadonlyMap<ColumnKey, ReadonlySet<string>>;
  mergedRows: readonly ReadonlySet<RowId>[];
  trimmedColumns: ReadonlySet<ColumnKey>;
  datedColumns: ReadonlyMap<ColumnKey, ReadonlySet<DateFormat>>;
  droppedDuplicates: ReadonlySet<DuplicateMode>;
};

// What the suggestions of these issues would change: the values they map, the rows they merge,
// and the rules that cover a whole column or every duplicate of a kind.
export function listCoverage({
  issues,
  changeOf,
}: {
  issues: readonly Issue[];
  changeOf: (issue: Issue) => Change | null;
}): Coverage {
  const mappedValues = new Map<ColumnKey, Set<string>>();
  const mergedRows: ReadonlySet<RowId>[] = [];
  const trimmedColumns = new Set<ColumnKey>();
  const datedColumns = new Map<ColumnKey, Set<DateFormat>>();
  const droppedDuplicates = new Set<DuplicateMode>();

  for (const issue of issues) {
    const suggestion = changeOf(issue);
    if (suggestion?.kind === 'mergeRows') {
      mergedRows.push(new Set([suggestion.keep, ...suggestion.remove]));
    }
    if (suggestion?.kind === 'trimWhitespace') {
      trimmedColumns.add(suggestion.column);
    }
    if (suggestion?.kind === 'standardizeDates') {
      const formats = datedColumns.get(suggestion.column) ?? new Set();
      datedColumns.set(suggestion.column, formats.add(suggestion.format));
    }
    if (suggestion?.kind === 'dropDuplicateRows') {
      droppedDuplicates.add(suggestion.mode);
    }
    if (suggestion?.kind !== 'mapValues') continue;

    const values = mappedValues.get(suggestion.column) ?? new Set<string>();
    for (const { variants } of suggestion.groups) {
      for (const variant of variants) values.add(normalizeWhitespace(variant));
    }
    mappedValues.set(suggestion.column, values);
  }

  return {
    mappedValues,
    mergedRows,
    trimmedColumns,
    datedColumns,
    droppedDuplicates,
  };
}
