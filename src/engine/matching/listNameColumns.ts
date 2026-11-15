import type { ColumnKey, Dataset } from '@/engine/dataset/dataset';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import { isNameHeader } from '@/engine/values/isNameHeader';

const MAX_NAME_COLUMNS = 2;

/**
 * The text columns that name a person, at most `MAX_NAME_COLUMNS`, in column order. When more
 * qualify, the ones with the most distinct values win: they tell people apart best.
 */
export function listNameColumns({
  dataset,
  profile,
}: {
  dataset: Dataset;
  profile: readonly ColumnProfile[];
}): ColumnKey[] {
  return profile
    .filter(
      ({ column, dominantType }) =>
        dominantType === 'text' &&
        isNameHeader(dataset.columns[column]?.header ?? '')
    )
    .sort(
      (first, second) =>
        second.distinctCount - first.distinctCount ||
        first.column - second.column
    )
    .slice(0, MAX_NAME_COLUMNS)
    .map(({ column }) => column)
    .sort((first, second) => first - second);
}
