import type { Dataset, Row, RowId } from '@/engine/dataset/dataset';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import { isIdentifierHeader } from '@/engine/values/isIdentifierHeader';
import { toMatchKey } from '@/engine/values/toMatchKey';
import type { MatchColumn } from './matchColumn';

/**
 * Columns whose values should identify a record: emails, phones and columns whose header names
 * a key, as long as most of the values in `rowIds` are distinct.
 */
export function listIdentifierColumns({
  dataset,
  profile,
  rowIds,
}: {
  dataset: Dataset;
  profile: readonly ColumnProfile[];
  rowIds: readonly RowId[];
}): MatchColumn[] {
  return profile.flatMap((columnProfile): MatchColumn[] => {
    if (columnProfile.dominantType === 'empty') return [];

    const { column, dominantType } = columnProfile;
    const header = dataset.columns[column]?.header ?? '';
    const isPhone = dominantType === 'phone';
    const saysIdentifier =
      isPhone || dominantType === 'email' || isIdentifierHeader(header);
    if (!saysIdentifier) return [];

    const matchColumn = { column, isPhone };

    return isMostlyDistinct({ rows: dataset.rows, rowIds, matchColumn })
      ? [matchColumn]
      : [];
  });
}

// Callers leave out the rows the duplicate checks remove, so what repeats is a value several
// records share; a column where more than one value in five repeats groups rows, not names them.
const MIN_IDENTIFIER_DISTINCT_SHARE = 0.8;

function isMostlyDistinct({
  rows,
  rowIds,
  matchColumn,
}: {
  rows: readonly Row[];
  rowIds: readonly RowId[];
  matchColumn: MatchColumn;
}): boolean {
  const { column, isPhone } = matchColumn;
  const distinctKeys = new Set<string>();
  let keyedCount = 0;

  for (const rowId of rowIds) {
    const key = toMatchKey({ value: rows[rowId]?.[column] ?? '', isPhone });
    if (key === null) continue;

    distinctKeys.add(key);
    keyedCount += 1;
  }

  return (
    keyedCount > 0 &&
    distinctKeys.size / keyedCount >= MIN_IDENTIFIER_DISTINCT_SHARE
  );
}
