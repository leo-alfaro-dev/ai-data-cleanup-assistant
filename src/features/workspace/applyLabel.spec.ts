import { describe, expect, it } from 'vitest';
import type { Change } from '@/engine/changes/change';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { applyLabel } from './applyLabel';

const column = toColumnKey(0);

describe('applyLabel', () => {
  it.each<{ name: string; change: Change; label: string }>([
    {
      name: 'a trim',
      change: { kind: 'trimWhitespace', column },
      label: 'Trim spaces',
    },
    {
      name: 'a mapping to one spelling',
      change: {
        kind: 'mapValues',
        column,
        groups: [{ canonical: 'Paris', variants: ['paris'] }],
      },
      label: 'Replace values',
    },
    {
      name: 'a mapping to empty cells',
      change: {
        kind: 'mapValues',
        column,
        groups: [{ canonical: '', variants: ['N/A'] }],
      },
      label: 'Clear values',
    },
    {
      name: 'a date rewrite',
      change: { kind: 'standardizeDates', column, format: 'YYYY-MM-DD' },
      label: 'Convert dates',
    },
    {
      name: 'dropped duplicates',
      change: {
        kind: 'dropDuplicateRows',
        mode: 'exact',
        groups: [[toRowId(1), toRowId(2)]],
      },
      label: 'Remove duplicates',
    },
    {
      name: 'one cell',
      change: {
        kind: 'setCells',
        cells: [{ rowId: toRowId(1), column, value: 'a' }],
      },
      label: 'Correct cell',
    },
    {
      name: 'several cells',
      change: {
        kind: 'setCells',
        cells: [
          { rowId: toRowId(1), column, value: 'a' },
          { rowId: toRowId(2), column, value: 'b' },
        ],
      },
      label: 'Correct cells',
    },
    {
      name: 'a merge that only removes a row, by its number',
      change: {
        kind: 'mergeRows',
        keep: toRowId(0),
        remove: [toRowId(9)],
        values: [{ column, from: toRowId(0) }],
      },
      label: 'Remove row 11',
    },
    {
      name: 'a merge that takes values into the kept row',
      change: {
        kind: 'mergeRows',
        keep: toRowId(0),
        remove: [toRowId(9)],
        values: [{ column, from: toRowId(9) }],
      },
      label: 'Merge into row 2',
    },
    {
      name: 'several removed rows, by count',
      change: { kind: 'removeRows', rows: [toRowId(3), toRowId(4)] },
      label: 'Remove 2 rows',
    },
  ])('names $name', ({ change, label }) => {
    expect(applyLabel(change)).toBe(label);
  });
});
