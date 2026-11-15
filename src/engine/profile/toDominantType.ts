import { VALUE_TYPES } from '@/engine/values/valueType';
import type { TypeCounts } from './columnProfile';

export function toDominantType({
  typeCounts,
  nonBlankCount,
}: {
  typeCounts: TypeCounts;
  nonBlankCount: number;
}): keyof TypeCounts | 'mixed' {
  const shareOf = (count: number) => count / nonBlankCount;

  const sharedType = COUNTED_TYPES.find(
    (type) => shareOf(typeCounts[type]) >= DOMINANT_SHARE
  );
  if (sharedType) return sharedType;

  const numericCount = typeCounts.integer + typeCounts.decimal;
  const isNumeric = shareOf(numericCount) >= DOMINANT_SHARE;

  return isNumeric ? 'decimal' : 'mixed';
}

// Leaves room for one value in five to be a typo or a placeholder.
const DOMINANT_SHARE = 0.8;

const COUNTED_TYPES = VALUE_TYPES.filter((type) => type !== 'empty');
