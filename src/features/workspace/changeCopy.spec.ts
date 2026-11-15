import { describe, expect, it } from 'vitest';
import type { Change } from '@/engine/changes/change';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { describeChange } from './changeCopy';

const columns = [
  { key: toColumnKey(0), header: 'name' },
  { key: toColumnKey(1), header: 'email' },
];
const email = toColumnKey(1);

describe('describeChange', () => {
  it.each<{ name: string; change: Change; text: string }>([
    {
      name: 'a trim',
      change: { kind: 'trimWhitespace', column: email },
      text: 'Remove extra spaces from the values in “email”.',
    },
    {
      name: 'a mapping to one spelling',
      change: {
        kind: 'mapValues',
        column: email,
        groups: [{ canonical: 'Paris', variants: ['paris', 'PARIS'] }],
      },
      text: 'Replace the variants of 1 value in “email” with their common spelling.',
    },
    {
      name: 'a mapping to empty cells',
      change: {
        kind: 'mapValues',
        column: email,
        groups: [{ canonical: '', variants: ['N/A', '-'] }],
      },
      text: 'Replace these values in “email” with empty cells.',
    },
    {
      name: 'a date rewrite',
      change: { kind: 'standardizeDates', column: email, format: 'YYYY-MM-DD' },
      text: 'Write the dates in “email” as YYYY-MM-DD. Dates that could be read two ways stay as they are.',
    },
    {
      name: 'dropping duplicates',
      change: {
        kind: 'dropDuplicateRows',
        mode: 'exact',
        groups: [
          [toRowId(0), toRowId(1), toRowId(2)],
          [toRowId(5), toRowId(6)],
        ],
      },
      text: 'Remove 3 rows and keep the first row of each group.',
    },
    {
      name: 'setting cells',
      change: {
        kind: 'setCells',
        cells: [{ rowId: toRowId(3), column: email, value: 'a@example.com' }],
      },
      text: 'Correct 1 cell in “email”.',
    },
    {
      name: 'a merge',
      change: {
        kind: 'mergeRows',
        keep: toRowId(0),
        remove: [toRowId(4)],
        values: [
          { column: toColumnKey(0), from: toRowId(0) },
          { column: email, from: toRowId(4) },
        ],
      },
      text: "Keep row 2 and remove row 6. Row 2 takes the other row's value in 1 cell.",
    },
    {
      name: 'a merge of three rows',
      change: {
        kind: 'mergeRows',
        keep: toRowId(0),
        remove: [toRowId(4), toRowId(7)],
        values: [],
      },
      text: 'Keep row 2 and remove rows 6, 9.',
    },
    {
      name: 'removing rows',
      change: { kind: 'removeRows', rows: [toRowId(1), toRowId(2)] },
      text: 'Remove 2 rows.',
    },
  ])('words $name', ({ change, text }) => {
    expect(describeChange({ change, columns })).toBe(text);
  });
});
