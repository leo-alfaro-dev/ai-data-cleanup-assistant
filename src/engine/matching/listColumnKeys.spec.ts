import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { toDataset } from '@/engine/testing/toDataset';
import { listColumnKeys } from './listColumnKeys';

const { rows } = toDataset(
  'name,phone',
  'Ada,(212) 555-0101',
  ' ADA ,212.555.0101',
  ',N/A',
  'Bo,555'
);
const everyRow = rows.map((_, index) => toRowId(index));
const noKeys: ReadonlySet<string> = new Set();

describe('listColumnKeys', () => {
  it('holds each row match key at its row id, empty where the cell has none', () => {
    expect(
      listColumnKeys({
        rows,
        rowIds: everyRow,
        matchColumn: { column: toColumnKey(0), isPhone: false },
        ignoredKeys: noKeys,
      })
    ).toEqual(['ada', 'ada', '', 'bo']);
  });

  it('uses digits for a phone column', () => {
    expect(
      listColumnKeys({
        rows,
        rowIds: everyRow,
        matchColumn: { column: toColumnKey(1), isPhone: true },
        ignoredKeys: noKeys,
      })
    ).toEqual(['2125550101', '2125550101', '', '']);
  });

  it('holds the empty string for ignored keys and for rows it is not given', () => {
    expect(
      listColumnKeys({
        rows,
        rowIds: [toRowId(0), toRowId(3)],
        matchColumn: { column: toColumnKey(0), isPhone: false },
        ignoredKeys: new Set(['bo']),
      })
    ).toEqual(['ada', '', '', '']);
  });
});
