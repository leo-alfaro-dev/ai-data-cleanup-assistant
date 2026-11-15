import { describe, expect, it } from 'vitest';
import { findExactDuplicates } from '@/engine/checks/findExactDuplicates';
import { findNormalizedDuplicates } from '@/engine/checks/findNormalizedDuplicates';
import { profileDataset } from '@/engine/profile/profileDataset';
import { listRemovedRows } from '@/engine/testing/listRemovedRows';
import { toDataset } from '@/engine/testing/toDataset';
import { listDuplicateCopyRows } from './listDuplicateCopyRows';

describe('listDuplicateCopyRows', () => {
  it('lists the rows the exact and normalized checks would remove, and no others', () => {
    const dataset = toDataset(
      'id,name',
      '1,Ada',
      '2,Bo',
      '1,ADA',
      '3,Cy',
      '2,Bo',
      '1,Ada',
      '3, cy',
      '4,Di'
    );
    const profile = profileDataset(dataset);
    const issues = [findExactDuplicates, findNormalizedDuplicates].flatMap(
      (check) => check.find({ dataset, profile })
    );

    const copies = [...listDuplicateCopyRows(dataset.rows)].sort(
      (first, second) => first - second
    );

    expect(copies).toEqual(listRemovedRows({ dataset, issues }));
    expect(copies).toEqual([2, 4, 5, 6]);
  });

  it('lists nothing when every row is distinct', () => {
    const dataset = toDataset('id,name', '1,Ada', '2,Bo');

    expect(listDuplicateCopyRows(dataset.rows).size).toBe(0);
  });

  it('never lists a blank row', () => {
    const dataset = toDataset('id,name', ',', ' , ', '1,Ada');

    expect(listDuplicateCopyRows(dataset.rows).size).toBe(0);
  });
});
