import { describe, expect, it } from 'vitest';
import { toDataset } from '@/engine/testing/toDataset';
import { groupExactDuplicateRows } from './groupExactDuplicateRows';

describe('groupExactDuplicateRows', () => {
  it('groups rows equal cell by cell and skips blank rows', () => {
    const { rows } = toDataset('id,name', '1,Ada', '2,Bo', '1,Ada', ',', ',');

    expect(groupExactDuplicateRows(rows)).toEqual([[0, 2]]);
  });

  it('groups the same rows once and shares the result', () => {
    const { rows } = toDataset('id,name', '1,Ada', '1,Ada');

    expect(groupExactDuplicateRows(rows)).toBe(groupExactDuplicateRows(rows));
  });
});
