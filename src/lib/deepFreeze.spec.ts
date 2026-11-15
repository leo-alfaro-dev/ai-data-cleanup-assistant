import { describe, expect, it } from 'vitest';
import { deepFreeze } from './deepFreeze';

describe('deepFreeze', () => {
  it('freezes every nested object and array', () => {
    const value = deepFreeze({ rows: [['Ada', '34']], format: { bom: false } });

    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.rows)).toBe(true);
    expect(Object.isFrozen(value.rows[0])).toBe(true);
    expect(Object.isFrozen(value.format)).toBe(true);
  });

  it('freezes the children of an object that was only frozen shallowly', () => {
    const value = deepFreeze(Object.freeze({ rows: [['Ada']] }));

    expect(Object.isFrozen(value.rows)).toBe(true);
  });

  it('returns the value it was given', () => {
    const value = { name: 'Ada' };

    expect(deepFreeze(value)).toBe(value);
  });

  it.each([
    { name: 'a string', value: 'Ada' },
    { name: 'a number', value: 34 },
    { name: 'null', value: null },
    { name: 'undefined', value: undefined },
  ])('passes $name through', ({ value }) => {
    expect(deepFreeze(value)).toBe(value);
  });

  it('makes writes throw', () => {
    const rows = deepFreeze([['Ada', '34']]);

    expect(() => rows.push(['Bob', '41'])).toThrow(TypeError);
    expect(() => {
      const [row] = rows;
      if (row) row[0] = 'Eve';
    }).toThrow(TypeError);
  });
});
