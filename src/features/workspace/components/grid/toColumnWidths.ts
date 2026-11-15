import type { Column, Row } from '@/engine/dataset/dataset';

export const MIN_COLUMN_WIDTH = 96;

export const MAX_COLUMN_WIDTH = 288;

const SAMPLE_ROWS = 100;

const CHARACTER_WIDTH = 7.5;

const CELL_PADDING = 24;

export function toColumnWidths({
  columns,
  rows,
}: {
  columns: readonly Column[];
  rows: readonly Row[];
}): number[] {
  const sample = rows.slice(0, SAMPLE_ROWS);

  return columns.map(({ key, header }) => {
    const longest = sample.reduce(
      (length, row) => Math.max(length, row[key]?.length ?? 0),
      header.length
    );
    const width = Math.ceil(longest * CHARACTER_WIDTH) + CELL_PADDING;

    return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width));
  });
}
