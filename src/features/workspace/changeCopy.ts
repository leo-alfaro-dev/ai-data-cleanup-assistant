import type { Change } from '@/engine/changes/change';
import type { Column } from '@/engine/dataset/dataset';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
import { countOf } from '@/lib/countOf';
import { quote } from '@/lib/quote';
import { toColumnLabel } from './toColumnLabel';

export function describeChange({
  change,
  columns,
}: {
  change: Change;
  columns: readonly Column[];
}): string {
  const nameOf = (column: Column['key']) =>
    quote(toColumnLabel({ columns, column }));

  switch (change.kind) {
    case 'trimWhitespace':
      return `Remove extra spaces from the values in ${nameOf(change.column)}.`;
    case 'mapValues': {
      const isClearing = change.groups.every(
        ({ canonical }) => canonical === ''
      );

      return isClearing
        ? `Replace these values in ${nameOf(change.column)} with empty cells.`
        : `Replace the variants of ${countOf({ count: change.groups.length, noun: 'value' })} in ${nameOf(change.column)} with their common spelling.`;
    }
    case 'standardizeDates':
      return `Write the dates in ${nameOf(change.column)} as ${change.format}. Dates that could be read two ways stay as they are.`;
    case 'dropDuplicateRows': {
      const removed = change.groups.reduce(
        (sum, group) => sum + group.length - 1,
        0
      );

      return `Remove ${countOf({ count: removed, noun: 'row' })} and keep the first row of each group.`;
    }
    case 'setCells': {
      const [first] = change.cells;
      const where = first ? ` in ${nameOf(first.column)}` : '';

      return `Correct ${countOf({ count: change.cells.length, noun: 'cell' })}${where}.`;
    }
    case 'mergeRows': {
      const removed = change.remove.map(toRowNumber).join(', ');
      const noun = change.remove.length === 1 ? 'row' : 'rows';
      const kept = toRowNumber(change.keep);
      const taken = change.values.filter(({ from }) => from !== change.keep);

      const takes =
        taken.length === 0
          ? ''
          : ` Row ${kept} takes the other ${noun === 'row' ? "row's" : "rows'"} value in ${countOf({ count: taken.length, noun: 'cell' })}.`;

      return `Keep row ${kept} and remove ${noun} ${removed}.${takes}`;
    }
    case 'removeRows':
      return `Remove ${countOf({ count: change.rows.length, noun: 'row' })}.`;
  }
}
