import type { ColumnKey } from '@/engine/dataset/dataset';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import { toMatchKey } from '@/engine/values/toMatchKey';
import type { EvidenceColumn } from './evidenceColumn';
import { MAX_ROWS_PER_RECORD } from './maxRowsPerRecord';

/**
 * Every column outside `excluded` that has values, each with the values that do not count as
 * evidence because too many rows hold them (a country, a default of 0.00).
 */
export function listEvidenceColumns({
  profile,
  excluded,
}: {
  profile: readonly ColumnProfile[];
  excluded: readonly ColumnKey[];
}): EvidenceColumn[] {
  return profile.flatMap((columnProfile) => {
    const { column } = columnProfile;
    if (columnProfile.dominantType === 'empty' || excluded.includes(column)) {
      return [];
    }

    const isPhone = columnProfile.dominantType === 'phone';
    return [
      {
        column,
        isPhone,
        commonKeys: listCommonKeys({ columnProfile, isPhone }),
      },
    ];
  });
}

// A value is common when more than this share of the rows hold it and it is on more than
// `MAX_ROWS_PER_RECORD` rows, so a value in a small file is never common.
const MAX_COMMON_VALUE_SHARE = 0.1;

// Case and layout variants add up, as they do in the match.
function listCommonKeys({
  columnProfile,
  isPhone,
}: {
  columnProfile: ColumnProfile;
  isPhone: boolean;
}): Set<string> {
  const counts = new Map<string, number>();
  for (const { value, count } of columnProfile.distinctValues) {
    const key = toMatchKey({ value, isPhone });
    if (key !== null) counts.set(key, (counts.get(key) ?? 0) + count);
  }

  const commonKeys = new Set<string>();
  for (const [key, count] of counts) {
    const isCommon =
      count > MAX_ROWS_PER_RECORD &&
      count > MAX_COMMON_VALUE_SHARE * columnProfile.nonBlankCount;
    if (isCommon) commonKeys.add(key);
  }

  return commonKeys;
}
