import { describe, expect, it } from 'vitest';
import { toDataset } from '@/engine/testing/toDataset';
import { groupNormalizedDuplicateRows } from './groupNormalizedDuplicateRows';

describe('groupNormalizedDuplicateRows', () => {
  it('groups rows equal after normalizing and leaves exact copies out', () => {
    const { rows } = toDataset('id,name', '1,Ada', '1,Ada', '1, ADA ', '2,Bo');

    expect(groupNormalizedDuplicateRows(rows)).toEqual([[0, 2]]);
  });

  it('groups the same rows once and shares the result', () => {
    const { rows } = toDataset('id,name', '1,Ada', '1,ADA');

    expect(groupNormalizedDuplicateRows(rows)).toBe(
      groupNormalizedDuplicateRows(rows)
    );
  });
});
