import { describe, expect, it } from 'vitest';
import type { Dataset, RowId } from '@/engine/dataset/dataset';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { listRemovedRows } from '@/engine/testing/listRemovedRows';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findExactDuplicates } from './findExactDuplicates';

describe('findExactDuplicates', () => {
  it('finds two identical rows as one issue that suggests dropping the second', () => {
    const dataset = toDataset('id,name', '1,Ada', '2,Bo', '1,Ada');

    const issues = findDuplicates(dataset);

    expect(issues).toEqual([
      {
        id: toIssueId('exact-duplicates'),
        category: 'duplicate',
        source: 'check',
        confidence: 'certain',
        rows: [0, 2],
        column: null,
        suggestion: {
          kind: 'dropDuplicateRows',
          mode: 'exact',
          groups: [[0, 2]],
        },
        details: { kind: 'exactDuplicates', groups: [[0, 2]] },
      },
    ]);
    expect(listRemovedRows({ dataset, issues })).toEqual([2]);
  });

  it('forms one group from three copies and keeps the first', () => {
    const dataset = toDataset('id,name', '1,Ada', '1,Ada', '1,Ada');

    const issues = findDuplicates(dataset);

    expect(groupsOf(issues)).toEqual([[0, 1, 2]]);
    expect(listRemovedRows({ dataset, issues })).toEqual([1, 2]);
  });

  it('keeps the first row of each of several interleaved groups', () => {
    const dataset = toDataset(
      'id,name',
      '1,Ada',
      '2,Bo',
      '1,Ada',
      '3,Cy',
      '2,Bo',
      '1,Ada'
    );

    const issues = findDuplicates(dataset);

    expect(groupsOf(issues)).toEqual([
      [0, 2, 5],
      [1, 4],
    ]);
    expect(issues[0]?.rows).toEqual([0, 1, 2, 4, 5]);
    expect(listRemovedRows({ dataset, issues })).toEqual([2, 4, 5]);
  });

  it('leaves rows that differ by one character', () => {
    const dataset = toDataset('id,name', '1,Ada', '1,Adb');

    expect(findDuplicates(dataset)).toEqual([]);
  });

  it('leaves rows that differ only by case, spacing or a non-breaking space', () => {
    const dataset = toDataset(
      'id,name',
      '1,Ada',
      '1,ADA',
      '1,Ada ',
      '1, Ada',
      '1,Ada '
    );

    expect(findDuplicates(dataset)).toEqual([]);
  });

  it('leaves Unicode variants of the same text that are not the same characters', () => {
    const dataset = toDataset('id,name', '1,Ada', '1,Ａda');

    expect(findDuplicates(dataset)).toEqual([]);
  });

  it('does not let content move across a cell boundary', () => {
    const dataset = toDataset('first,second', 'a,bc', 'ab,c');

    expect(findDuplicates(dataset)).toEqual([]);
  });

  it('finds nothing when every row is distinct', () => {
    const dataset = toDataset('id,name', '1,Ada', '2,Bo', '3,Cy');

    expect(findDuplicates(dataset)).toEqual([]);
  });

  it('finds nothing in a file with one row', () => {
    expect(findDuplicates(toDataset('id,name', '1,Ada'))).toEqual([]);
  });

  it('ignores rows that are entirely blank, whatever the blank characters', () => {
    const dataset = toDataset('id,name', ' ,', ' ,\t', ',', '1,Ada');

    expect(findDuplicates(dataset)).toEqual([]);
  });

  it('treats a row with one filled cell as a normal row', () => {
    const dataset = toDataset('id,name', ',Ada', ',Ada', ',');

    expect(groupsOf(findDuplicates(dataset))).toEqual([[0, 1]]);
  });

  it('compares a short row as if padded with empty cells', () => {
    const dataset = toDataset('id,name', '1', '1,', '1,x');

    expect(groupsOf(findDuplicates(dataset))).toEqual([[0, 1]]);
  });

  it('reads every row once', () => {
    const rowCount = 50;
    const dataset = toDataset(
      'id,name',
      ...Array.from({ length: rowCount }, (_, index) => `${index % 7},x`)
    );
    const watched = watchRowReads(dataset);

    findExactDuplicates.find({
      dataset: watched.dataset,
      profile: profileDataset(dataset),
    });

    const rowReads = watched.reads.filter((property) => /^\d+$/.test(property));
    expect(rowReads).toHaveLength(rowCount);
  });
});

function findDuplicates(dataset: Dataset) {
  return findExactDuplicates.find({
    dataset,
    profile: profileDataset(dataset),
  });
}

function groupsOf(
  issues: ReturnType<typeof findDuplicates>
): readonly (readonly RowId[])[] {
  const [issue] = issues;
  if (issue?.details.kind !== 'exactDuplicates') return [];

  return issue.details.groups;
}
