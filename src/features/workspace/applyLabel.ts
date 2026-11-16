import type { Change } from '@/engine/changes/change';
import type { RowId } from '@/engine/dataset/dataset';
import { toRowNumber } from '@/engine/dataset/toRowNumber';
import { countOf } from '@/lib/countOf';

/** The apply button's label: what applying the suggestion does to the data. */
export function applyLabel(change: Change): string {
  switch (change.kind) {
    case 'trimWhitespace':
      return 'Trim spaces';
    case 'mapValues': {
      const isClearing = change.groups.every(
        ({ canonical }) => canonical === ''
      );

      return isClearing ? 'Clear values' : 'Replace values';
    }
    case 'standardizeDates':
      return 'Convert dates';
    case 'dropDuplicateRows':
      return 'Remove duplicates';
    case 'setCells':
      return change.cells.length === 1 ? 'Correct cell' : 'Correct cells';
    case 'mergeRows': {
      const takesValues = change.values.some(
        ({ from }) => from !== change.keep
      );
      if (takesValues) return `Merge into row ${toRowNumber(change.keep)}`;

      return removeLabel(change.remove);
    }
    case 'removeRows':
      return removeLabel(change.rows);
  }
}

function removeLabel(rows: readonly RowId[]): string {
  const [only] = rows;
  if (rows.length === 1 && only !== undefined) {
    return `Remove row ${toRowNumber(only)}`;
  }

  return `Remove ${countOf({ count: rows.length, noun: 'row' })}`;
}
