import { describe, expect, it } from 'vitest';
import { toRowId } from '@/engine/dataset/toRowId';
import { connectRowGroups } from './connectRowGroups';

function groupsOf(...groups: number[][]) {
  return groups.map((group) => group.map(toRowId));
}

describe('connectRowGroups', () => {
  it('keeps groups that share no row apart', () => {
    expect(connectRowGroups(groupsOf([4, 5], [0, 1]))).toEqual([
      [0, 1],
      [4, 5],
    ]);
  });

  it('merges two groups that share a row', () => {
    expect(connectRowGroups(groupsOf([0, 3], [3, 7]))).toEqual([[0, 3, 7]]);
  });

  it('merges a chain of groups however they are listed', () => {
    const chain = groupsOf([8, 9], [0, 1], [1, 4], [4, 8]);

    expect(connectRowGroups(chain)).toEqual([[0, 1, 4, 8, 9]]);
  });

  it('merges groups that repeat the same rows', () => {
    expect(connectRowGroups(groupsOf([2, 6], [2, 6]))).toEqual([[2, 6]]);
  });

  it('merges a group into two earlier components that it bridges', () => {
    expect(connectRowGroups(groupsOf([0, 1], [5, 6], [1, 5], [9, 10]))).toEqual(
      [
        [0, 1, 5, 6],
        [9, 10],
      ]
    );
  });

  it('gives nothing for no groups and keeps a single row as its own component', () => {
    expect(connectRowGroups([])).toEqual([]);
    expect(connectRowGroups(groupsOf([3]))).toEqual([[3]]);
  });

  it('copes with a long chain', () => {
    const length = 50_000;
    const chain = Array.from({ length }, (_, index) => [
      toRowId(length - index - 1),
      toRowId(length - index),
    ]);

    const [component, ...rest] = connectRowGroups(chain);

    expect(rest).toEqual([]);
    expect(component).toHaveLength(length + 1);
  });
});
