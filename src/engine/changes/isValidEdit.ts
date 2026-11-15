import type { ColumnKey } from '@/engine/dataset/dataset';
import { isBlank } from '@/engine/values/isBlank';
import type { Change, MapValues, MergeRows, SetCells } from './change';

/**
 * Whether an edit still does what the suggestion proposed: the same kind of change, on the same
 * column, rows and values it named. Anything it cites that the suggestion did not is refused.
 */
export function isValidEdit({
  original,
  edited,
}: {
  original: Change;
  edited: Change;
}): boolean {
  if (original.kind === 'mapValues' && edited.kind === 'mapValues') {
    return isValidMapValues({ original, edited });
  }
  if (original.kind === 'mergeRows' && edited.kind === 'mergeRows') {
    return isValidMergeRows({ original, edited });
  }
  if (original.kind === 'setCells' && edited.kind === 'setCells') {
    return isValidSetCells({ original, edited });
  }

  return false;
}

function isValidMapValues({
  original,
  edited,
}: {
  original: MapValues;
  edited: MapValues;
}): boolean {
  if (edited.column !== original.column || edited.groups.length === 0) {
    return false;
  }

  const offered = new Set(original.groups.flatMap(({ variants }) => variants));
  const used = new Set<string>();

  return edited.groups.every(({ canonical, variants }) => {
    const source = original.groups.find((group) =>
      group.variants.some((variant) => variants.includes(variant))
    );
    const hasCanonical = !isBlank(canonical) || source?.canonical === '';
    const isOffered = variants.every(
      (variant) => offered.has(variant) && !used.has(variant)
    );
    for (const variant of variants) used.add(variant);

    return variants.length > 0 && hasCanonical && isOffered;
  });
}

function isValidMergeRows({
  original,
  edited,
}: {
  original: MergeRows;
  edited: MergeRows;
}): boolean {
  const rows = new Set([original.keep, ...original.remove]);
  const removed = new Set(edited.remove);
  const columns = new Set(original.values.map(({ column }) => column));
  const chosen = new Set<ColumnKey>();

  const isKeepOffered = rows.has(edited.keep);
  const isRemovalExact =
    removed.size === rows.size - 1 &&
    edited.remove.length === removed.size &&
    [...removed].every((rowId) => rows.has(rowId) && rowId !== edited.keep);
  const areChoicesOffered = edited.values.every(({ column, from }) => {
    const isNew = !chosen.has(column);
    chosen.add(column);

    return isNew && columns.has(column) && rows.has(from);
  });

  return isKeepOffered && isRemovalExact && areChoicesOffered;
}

function isValidSetCells({
  original,
  edited,
}: {
  original: SetCells;
  edited: SetCells;
}): boolean {
  const toKey = ({ rowId, column }: SetCells['cells'][number]) =>
    `${rowId}:${column}`;
  const offered = new Set(original.cells.map(toKey));
  const edits = new Set(edited.cells.map(toKey));

  return (
    edited.cells.length === original.cells.length &&
    edits.size === edited.cells.length &&
    edited.cells.every((cell) => offered.has(toKey(cell)))
  );
}
