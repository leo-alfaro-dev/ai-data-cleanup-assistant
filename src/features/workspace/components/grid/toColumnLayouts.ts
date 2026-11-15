import type { Column } from '@/engine/dataset/dataset';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import { isNumericType } from '@/engine/values/isNumericType';
import type { ColumnLayout } from './columnLayout';
import { ROW_NUMBER_WIDTH } from './gridLayout';

// Columns sit after the row-number column, one after the other.
export function toColumnLayouts({
  columns,
  widths,
  profile,
}: {
  columns: readonly Column[];
  widths: readonly number[];
  profile: readonly ColumnProfile[];
}): ColumnLayout[] {
  let left = ROW_NUMBER_WIDTH;

  return columns.map((column, index) => {
    const width = widths[index] ?? 0;
    const layout = {
      column,
      left,
      width,
      isNumeric: isNumericType(profile[index]?.dominantType),
    };
    left += width;

    return layout;
  });
}
