import type { RowId } from '@/engine/dataset/dataset';
import { isOneEditApart } from '@/engine/values/isOneEditApart';

/**
 * Whether any removed row has a different name from the kept row's: more than one edit apart
 * (`Jon`, `John` is a typo; `John`, `Jane` is not) in a name column both rows fill. `nameKeys`
 * holds one array of keys per name column.
 */
export function hasConflictingNames({
  nameKeys,
  keep,
  remove,
}: {
  nameKeys: readonly (readonly string[])[];
  keep: RowId;
  remove: readonly RowId[];
}): boolean {
  return remove.some((rowId) =>
    nameKeys.some((keys) => {
      const keptName = keys[keep] ?? '';
      const otherName = keys[rowId] ?? '';
      const isComparable = keptName !== '' && otherName !== '';

      return (
        isComparable &&
        keptName !== otherName &&
        !isOneEditApart({ first: keptName, second: otherName })
      );
    })
  );
}
