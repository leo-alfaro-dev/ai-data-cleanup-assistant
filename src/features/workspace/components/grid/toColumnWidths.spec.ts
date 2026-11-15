import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import {
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  toColumnWidths,
} from './toColumnWidths';

const columns = [
  { key: toColumnKey(0), header: 'id' },
  { key: toColumnKey(1), header: 'email' },
  { key: toColumnKey(2), header: 'notes' },
];

describe('toColumnWidths', () => {
  it('gives a short column the minimum and a very long one the maximum', () => {
    const widths = toColumnWidths({
      columns,
      rows: [['1', 'ada@example.com', 'x'.repeat(500)]],
    });

    expect(widths[0]).toBe(MIN_COLUMN_WIDTH);
    expect(widths[2]).toBe(MAX_COLUMN_WIDTH);
  });

  it('sizes a column by its longest sampled value or its header', () => {
    const [idWidth, emailWidth] = toColumnWidths({
      columns,
      rows: [
        ['1', 'ada@example.com', ''],
        ['2', 'grace.hopper@example.com', ''],
      ],
    });

    expect(emailWidth).toBe(Math.ceil(24 * 7.5) + 24);
    expect(idWidth).toBe(MIN_COLUMN_WIDTH);
    expect(
      toColumnWidths({
        columns: [{ key: toColumnKey(0), header: 'a_rather_long_header_name' }],
        rows: [['1']],
      })[0]
    ).toBe(Math.ceil(25 * 7.5) + 24);
  });

  it('reads only the first rows', () => {
    const rows = [
      ...Array.from({ length: 100 }, () => ['1', 'a', 'b']),
      ['1', 'x'.repeat(100), 'b'],
    ];

    expect(toColumnWidths({ columns, rows })[1]).toBe(MIN_COLUMN_WIDTH);
  });

  it('works from the header alone while no rows have arrived', () => {
    expect(toColumnWidths({ columns, rows: [] })).toEqual([
      MIN_COLUMN_WIDTH,
      MIN_COLUMN_WIDTH,
      MIN_COLUMN_WIDTH,
    ]);
  });

  it('tolerates a short row', () => {
    expect(() => toColumnWidths({ columns, rows: [['1']] })).not.toThrow();
  });
});
