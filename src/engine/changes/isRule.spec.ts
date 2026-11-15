import { describe, expect, expectTypeOf, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Change, Rule } from './change';
import { isRule } from './isRule';

const column = toColumnKey(0);
const rowId = toRowId(0);

describe('isRule', () => {
  it.each([
    { kind: 'trimWhitespace', change: { kind: 'trimWhitespace', column } },
    { kind: 'mapValues', change: { kind: 'mapValues', column, groups: [] } },
    {
      kind: 'standardizeDates',
      change: { kind: 'standardizeDates', column, format: 'YYYY-MM-DD' },
    },
    {
      kind: 'dropDuplicateRows',
      change: { kind: 'dropDuplicateRows', mode: 'exact', groups: [] },
    },
  ] satisfies { kind: Rule['kind']; change: Rule }[])(
    'accepts $kind, which is row-independent',
    ({ change }) => {
      expect(isRule(change)).toBe(true);
    }
  );

  it.each([
    {
      kind: 'setCells',
      change: { kind: 'setCells', cells: [{ rowId, column, value: 'x' }] },
    },
    {
      kind: 'mergeRows',
      change: { kind: 'mergeRows', keep: rowId, remove: [], values: [] },
    },
    { kind: 'removeRows', change: { kind: 'removeRows', rows: [rowId] } },
  ] satisfies { kind: Change['kind']; change: Change }[])(
    'rejects $kind, which names its rows',
    ({ change }) => {
      expect(isRule(change)).toBe(false);
    }
  );

  it('narrows the type of the changes it keeps to Rule', () => {
    const changes: Change[] = [
      { kind: 'removeRows', rows: [rowId] },
      { kind: 'trimWhitespace', column },
    ];

    const rules = changes.filter(isRule);

    expectTypeOf(rules).toEqualTypeOf<Rule[]>();
    expect(rules).toEqual([{ kind: 'trimWhitespace', column }]);
  });
});
