import { describe, expect, it } from 'vitest';
import type { Dataset, RowId } from '@/engine/dataset/dataset';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { listRemovedRows } from '@/engine/testing/listRemovedRows';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findExactDuplicates } from './findExactDuplicates';
import { findNormalizedDuplicates } from './findNormalizedDuplicates';

describe('findNormalizedDuplicates', () => {
  it('finds rows that differ only by case as one issue that suggests dropping the second', () => {
    const dataset = toDataset(
      'id,name',
      'C-1,Ada Lovelace',
      'C-1,ADA LOVELACE'
    );

    const issues = findNormalized(dataset);

    expect(issues).toEqual([
      {
        id: toIssueId('normalized-duplicates'),
        category: 'duplicate',
        source: 'check',
        confidence: 'high',
        rows: [0, 1],
        column: null,
        suggestion: {
          kind: 'dropDuplicateRows',
          mode: 'normalized',
          groups: [[0, 1]],
        },
        details: { kind: 'normalizedDuplicates', groups: [[0, 1]] },
      },
    ]);
    expect(listRemovedRows({ dataset, issues })).toEqual([1]);
    expect(findExact(dataset)).toEqual([]);
  });

  it('finds rows that differ only by spacing, padding or a non-breaking space', () => {
    const dataset = toDataset(
      'id,name',
      '1,Ada Lovelace',
      '1, Ada  Lovelace ',
      '1,Ada Lovelace'
    );

    expect(groupsOf(findNormalized(dataset))).toEqual([[0, 1, 2]]);
    expect(findExact(dataset)).toEqual([]);
  });

  it('finds rows whose cells are the same text after Unicode compatibility folding', () => {
    const dataset = toDataset('id,name', '1,Ada', '1,Ａda', '1,ﬁx');

    expect(groupsOf(findNormalized(dataset))).toEqual([[0, 1]]);
  });

  it('leaves rows that differ by one character', () => {
    const dataset = toDataset('id,name', '1,Ada Lovelace', '1,Ada Lovelace2');

    expect(findNormalized(dataset)).toEqual([]);
  });

  it('does not let content move across a cell boundary', () => {
    const dataset = toDataset('first,second', 'a,bc', 'AB,C');

    expect(findNormalized(dataset)).toEqual([]);
  });

  it('leaves rows that are exact copies to the exact check', () => {
    const dataset = toDataset('id,name', '1,Ada', '1,Ada', '2,Bo');

    expect(findNormalized(dataset)).toEqual([]);
    expect(groupsOf(findExact(dataset))).toEqual([[0, 1]]);
  });

  it('never groups two rows that are exactly equal, so the checks remove different rows', () => {
    const dataset = toDataset('id,name', '1,Ada', '1,Ada', '1,ADA');

    const exact = findExact(dataset);
    const normalized = findNormalized(dataset);

    expect(groupsOf(exact)).toEqual([[0, 1]]);
    expect(groupsOf(normalized)).toEqual([[0, 2]]);
    expect(listRemovedRows({ dataset, issues: exact })).toEqual([1]);
    expect(listRemovedRows({ dataset, issues: normalized })).toEqual([2]);
  });

  it('keeps exact copies of a later spelling out of the normalized group', () => {
    const dataset = toDataset('id,name', '1,ADA', '1,Ada', '1,Ada', '1,Ada');

    const exact = findExact(dataset);
    const normalized = findNormalized(dataset);

    expect(groupsOf(exact)).toEqual([[1, 2, 3]]);
    expect(groupsOf(normalized)).toEqual([[0, 1]]);
    expect(
      listRemovedRows({ dataset, issues: [...exact, ...normalized] })
    ).toEqual([1, 2, 3]);
  });

  it('handles exact and normalized duplicates in one file, interleaved', () => {
    const dataset = toDataset(
      'id,name',
      '1,Ada',
      '2,Bo',
      '1,ADA',
      '3,Cy',
      '2,Bo',
      '1,Ada',
      '3, cy'
    );

    const exact = findExact(dataset);
    const normalized = findNormalized(dataset);

    expect(groupsOf(exact)).toEqual([
      [0, 5],
      [1, 4],
    ]);
    expect(groupsOf(normalized)).toEqual([
      [0, 2],
      [3, 6],
    ]);
    expect(normalized[0]?.rows).toEqual([0, 2, 3, 6]);
    expect(
      listRemovedRows({ dataset, issues: [...exact, ...normalized] })
    ).toEqual([2, 4, 5, 6]);
  });

  it('finds nothing when every row is distinct', () => {
    const dataset = toDataset('id,name', '1,Ada', '2,Bo', '3,Cy');

    expect(findNormalized(dataset)).toEqual([]);
  });

  it('finds nothing in a file with one row', () => {
    expect(findNormalized(toDataset('id,name', '1,Ada'))).toEqual([]);
  });

  it('ignores rows that are entirely blank', () => {
    const dataset = toDataset('id,name', ' ,', ' ,\t', ',', '1,Ada');

    expect(findNormalized(dataset)).toEqual([]);
  });

  it('treats a row with one filled cell as a normal row', () => {
    const dataset = toDataset('id,name', ',Ada', ', ADA', ',');

    expect(groupsOf(findNormalized(dataset))).toEqual([[0, 1]]);
  });

  it('reads every row once to find exact copies and each survivor once more', () => {
    const rowCount = 50;
    const distinctRows = 7;
    const dataset = toDataset(
      'id,name',
      ...Array.from(
        { length: rowCount },
        (_, index) => `${index % distinctRows},x`
      )
    );
    const watched = watchRowReads(dataset);

    findNormalizedDuplicates.find({
      dataset: watched.dataset,
      profile: profileDataset(dataset),
    });

    const rowReads = watched.reads.filter((property) => /^\d+$/.test(property));
    expect(rowReads).toHaveLength(rowCount + distinctRows);
  });
});

function findNormalized(dataset: Dataset) {
  return findNormalizedDuplicates.find({
    dataset,
    profile: profileDataset(dataset),
  });
}

function findExact(dataset: Dataset) {
  return findExactDuplicates.find({
    dataset,
    profile: profileDataset(dataset),
  });
}

function groupsOf(
  issues: ReturnType<typeof findNormalized>
): readonly (readonly RowId[])[] {
  const details = issues[0]?.details;
  if (details?.kind === 'exactDuplicates') return details.groups;
  if (details?.kind === 'normalizedDuplicates') return details.groups;

  return [];
}
