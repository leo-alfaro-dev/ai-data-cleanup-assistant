import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { MapValues, MergeRows, SetCells } from './change';
import { isValidEdit } from './isValidEdit';

const column = toColumnKey(1);
const [a, b, c] = [toRowId(1), toRowId(2), toRowId(3)];

const mapValues: MapValues = {
  kind: 'mapValues',
  column,
  groups: [
    { canonical: 'California', variants: ['CA', 'Calif.'] },
    { canonical: 'Texas', variants: ['TX'] },
  ],
};

describe('isValidEdit on a value mapping', () => {
  it('accepts a new canonical value and a variant taken out of a group', () => {
    expect(
      isValidEdit({
        original: mapValues,
        edited: {
          ...mapValues,
          groups: [
            { canonical: 'Golden State', variants: ['CA'] },
            { canonical: 'Texas', variants: ['TX'] },
          ],
        },
      })
    ).toBe(true);
  });

  it.each([
    [
      'a variant the suggestion never named',
      [{ canonical: 'California', variants: ['CA', 'Cali'] }],
    ],
    [
      'a variant in two groups',
      [
        { canonical: 'California', variants: ['CA'] },
        { canonical: 'Texas', variants: ['CA'] },
      ],
    ],
    [
      'a blank canonical value the suggestion did not clear',
      [{ canonical: '  ', variants: ['CA'] }],
    ],
    ['a group with no variants', [{ canonical: 'California', variants: [] }]],
    ['no groups at all', []],
  ])('refuses %s', (_name, groups) => {
    expect(
      isValidEdit({ original: mapValues, edited: { ...mapValues, groups } })
    ).toBe(false);
  });

  it('refuses another column', () => {
    expect(
      isValidEdit({
        original: mapValues,
        edited: { ...mapValues, column: toColumnKey(2) },
      })
    ).toBe(false);
  });

  it('allows an empty canonical value when the suggestion clears values', () => {
    const clearing: MapValues = {
      ...mapValues,
      groups: [{ canonical: '', variants: ['N/A'] }],
    };

    expect(isValidEdit({ original: clearing, edited: clearing })).toBe(true);
  });
});

describe('isValidEdit on a merge', () => {
  const merge: MergeRows = {
    kind: 'mergeRows',
    keep: a,
    remove: [b, c],
    values: [{ column, from: b }],
  };

  it('accepts another row to keep and another source of a value', () => {
    expect(
      isValidEdit({
        original: merge,
        edited: {
          kind: 'mergeRows',
          keep: b,
          remove: [a, c],
          values: [{ column, from: c }],
        },
      })
    ).toBe(true);
  });

  it.each([
    ['a row outside the group', { ...merge, keep: toRowId(9) }],
    ['a removal that leaves a row out', { ...merge, remove: [b] }],
    ['the kept row also removed', { ...merge, remove: [a, b] }],
    [
      'a value from outside the group',
      { ...merge, values: [{ column, from: toRowId(9) }] },
    ],
    [
      'a column the suggestion did not merge',
      { ...merge, values: [{ column: toColumnKey(7), from: b }] },
    ],
    [
      'the same column twice',
      {
        ...merge,
        values: [
          { column, from: b },
          { column, from: c },
        ],
      },
    ],
  ])('refuses %s', (_name, edited) => {
    expect(isValidEdit({ original: merge, edited })).toBe(false);
  });
});

describe('isValidEdit on cell values', () => {
  const cells: SetCells = {
    kind: 'setCells',
    cells: [
      { rowId: a, column, value: 'x@example.com' },
      { rowId: b, column, value: 'y@example.com' },
    ],
  };

  it('accepts any typed value, an empty one included, for the cells the suggestion named', () => {
    expect(
      isValidEdit({
        original: cells,
        edited: {
          kind: 'setCells',
          cells: [
            { rowId: a, column, value: '' },
            { rowId: b, column, value: 'typed' },
          ],
        },
      })
    ).toBe(true);
  });

  it.each([
    [
      'a cell the suggestion did not name',
      [
        { rowId: a, column, value: 'v' },
        { rowId: c, column, value: 'v' },
      ],
    ],
    ['a missing cell', [{ rowId: a, column, value: 'v' }]],
    [
      'a cell twice',
      [
        { rowId: a, column, value: 'v' },
        { rowId: a, column, value: 'w' },
      ],
    ],
  ])('refuses %s', (_name, edited) => {
    expect(
      isValidEdit({
        original: cells,
        edited: { kind: 'setCells', cells: edited },
      })
    ).toBe(false);
  });
});

describe('isValidEdit across kinds', () => {
  it('refuses an edit of another kind than the suggestion', () => {
    expect(
      isValidEdit({
        original: mapValues,
        edited: { kind: 'removeRows', rows: [a] },
      })
    ).toBe(false);
  });

  it('refuses to edit a rule that has no editor', () => {
    const trim = { kind: 'trimWhitespace' as const, column };

    expect(isValidEdit({ original: trim, edited: trim })).toBe(false);
  });
});
