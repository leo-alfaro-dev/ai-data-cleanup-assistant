import { describe, expect, it } from 'vitest';
import { toRowId } from '@/engine/dataset/toRowId';
import { hasConflictingNames } from './hasConflictingNames';

function conflict(columns: string[][], keep = 0, remove = [1]) {
  return hasConflictingNames({
    nameKeys: columns,
    keep: toRowId(keep),
    remove: remove.map(toRowId),
  });
}

describe('hasConflictingNames', () => {
  it.each([
    { name: 'identical names', first: 'ana', second: 'ana' },
    { name: 'one inserted letter', first: 'jon', second: 'john' },
    { name: 'one substituted letter', first: 'mark', second: 'mary' },
    { name: 'one swapped pair', first: 'nia', second: 'nai' },
  ])('does not conflict for $name', ({ first, second }) => {
    expect(conflict([[first, second]])).toBe(false);
  });

  it.each([
    { name: 'two letters different', first: 'daniel', second: 'danielle' },
    { name: 'three letters different', first: 'john', second: 'jane' },
    { name: 'a longer form', first: 'chris', second: 'christine' },
    { name: 'unrelated names', first: 'ana', second: 'luis' },
  ])('conflicts for $name', ({ first, second }) => {
    expect(conflict([[first, second]])).toBe(true);
  });

  it('conflicts when one name column differs even if another is identical', () => {
    const firstNames = ['john', 'jane'];
    const lastNames = ['smith', 'smith'];

    expect(conflict([firstNames, lastNames])).toBe(true);
    expect(conflict([lastNames, firstNames])).toBe(true);
  });

  it('conflicts when only one of several removed rows has another name', () => {
    expect(conflict([['ana', 'ana', 'luis']], 0, [1, 2])).toBe(true);
    expect(conflict([['ana', 'luis', 'ana']], 0, [1, 2])).toBe(true);
  });

  it('does not compare a name that is missing on either row', () => {
    expect(conflict([['ana', '']])).toBe(false);
    expect(conflict([['', 'luis']])).toBe(false);
  });

  it('decides on very long names without comparing every pair of characters', () => {
    const long = 'a'.repeat(200_000);

    expect(conflict([[long, `${long.slice(1)}b`]])).toBe(false);
    expect(conflict([[long, 'b'.repeat(200_000)]])).toBe(true);
  });

  it('does not conflict without name columns or without removed rows', () => {
    expect(conflict([])).toBe(false);
    expect(conflict([['ana', 'luis']], 0, [])).toBe(false);
  });

  it('compares the kept row only with the removed rows, not removed rows with each other', () => {
    expect(conflict([['ana', 'ana', 'luis']], 0, [1])).toBe(false);
  });
});
