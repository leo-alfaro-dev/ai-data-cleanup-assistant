import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findEmptyCells } from './findEmptyCells';

const NBSP = ' ';

describe('findEmptyCells', () => {
  it('finds the empty cells of a column as one certain issue with no suggestion', () => {
    const dataset = toDataset('id,name', '1,Ann', '2,', '3,Cy', '4,');

    expect(findEmpty(dataset)).toEqual([
      {
        id: toIssueId('empty-cells:1'),
        category: 'missing',
        source: 'check',
        confidence: 'certain',
        rows: [1, 3],
        column: 1,
        suggestion: null,
        details: { kind: 'emptyCells', filledCount: 2 },
      },
    ]);
  });

  it('counts empty, space-only and non-breaking-space-only cells alike', () => {
    const dataset = toDataset(
      'id,name',
      '1,',
      '2, ',
      `3,${NBSP}`,
      '4,\t',
      '5,Ann'
    );

    const [issue] = findEmpty(dataset);

    expect(issue?.rows).toEqual([0, 1, 2, 3]);
  });

  it('reports one issue per affected column, rows ascending', () => {
    const dataset = toDataset('id,name,city', '1,,Austin', '2,Bo,', '3,,');

    const issues = findEmpty(dataset);

    expect(
      issues.map(({ id, column, rows }) => ({ id, column, rows }))
    ).toEqual([
      { id: toIssueId('empty-cells:1'), column: 1, rows: [0, 2] },
      { id: toIssueId('empty-cells:2'), column: 2, rows: [1, 2] },
    ]);
  });

  it('gives no issue for a column without blanks', () => {
    const dataset = toDataset('id,name,city', '1,Ann,', '2,Bo,');

    expect(findEmpty(dataset).map(({ column }) => column)).toEqual([2]);
  });

  it('finds nothing in a complete file', () => {
    expect(findEmpty(toDataset('id,name', '1,Ann', '2,Bo'))).toEqual([]);
  });

  it('leaves a fully blank row to the structural check', () => {
    const dataset = toDataset('id,name', '1,Ann', ' , ', '3,', ',');

    const issues = findEmpty(dataset);

    expect(issues.map(({ column, rows }) => ({ column, rows }))).toEqual([
      { column: 1, rows: [2] },
    ]);
  });

  it('finds nothing when the only blanks are in fully blank rows', () => {
    expect(findEmpty(toDataset('id,name', '1,Ann', ',', ' , '))).toEqual([]);
  });

  it('does not count a placeholder as empty', () => {
    const dataset = toDataset('name', 'N/A', '-', 'null', 'Ann');

    expect(findEmpty(dataset)).toEqual([]);
  });

  it('counts the padding of a short row as empty cells', () => {
    const dataset = toDataset('id,name,city', '1,Ann,Austin', '2');

    const issues = findEmpty(dataset);

    expect(issues.map(({ column, rows }) => ({ column, rows }))).toEqual([
      { column: 1, rows: [1] },
      { column: 2, rows: [1] },
    ]);
  });

  it('reports a column that is empty in every row with no filled cells', () => {
    const dataset = toDataset('id,note', '1,', '2,');

    const [issue] = findEmpty(dataset);

    expect(issue?.rows).toEqual([0, 1]);
    expect(issue?.details).toEqual({ kind: 'emptyCells', filledCount: 0 });
  });

  it('leaves every blank of a one-column file to the structural check, since each is a blank row', () => {
    expect(findEmpty(toDataset('name', 'Ann', '""', ' ', 'Bo'))).toEqual([]);
  });

  it('does not make a column of one long row a missing-data issue for every other row', () => {
    const dataset = toDataset('id,name', '1,Ann', '2,Bo,extra', '3,Cy');

    expect(findEmpty(dataset)).toEqual([]);
  });

  it('reads every row once', () => {
    const rowCount = 50;
    const dataset = toDataset(
      'id,name',
      ...Array.from({ length: rowCount }, (_, index) => `${index},`)
    );
    const watched = watchRowReads(dataset);

    findEmptyCells.find({
      dataset: watched.dataset,
      profile: profileDataset(dataset),
    });

    const rowReads = watched.reads.filter((property) => /^\d+$/.test(property));
    expect(rowReads).toHaveLength(rowCount);
  });
});

function findEmpty(dataset: Dataset) {
  return findEmptyCells.find({ dataset, profile: profileDataset(dataset) });
}
