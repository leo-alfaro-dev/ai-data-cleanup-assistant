import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { cleanedValues } from '@/engine/testing/cleanedValues';
import { listChangedRows } from '@/engine/testing/listChangedRows';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findWhitespaceIssues } from './findWhitespaceIssues';

const NBSP = '\u00a0';

describe('findWhitespaceIssues', () => {
  it('finds padded cells in a column as one certain issue that suggests trimming it', () => {
    const dataset = toDataset('id,name', '1, Ann', '2,Bo', '3,Cy ', '4, Di ');

    const issues = findWhitespace(dataset);

    expect(issues).toEqual([
      {
        id: toIssueId('whitespace:1'),
        category: 'inconsistent',
        source: 'check',
        confidence: 'certain',
        rows: [0, 2, 3],
        column: 1,
        suggestion: { kind: 'trimWhitespace', column: toColumnKey(1) },
        details: {
          kind: 'whitespace',
          paddedCount: 3,
          innerCount: 0,
          nonBreakingCount: 0,
        },
      },
    ]);
    expect(cleanedValues({ dataset, issues })).toEqual([
      ['1', 'Ann'],
      ['2', 'Bo'],
      ['3', 'Cy'],
      ['4', 'Di'],
    ]);
  });

  it('finds non-breaking space padding and counts it apart', () => {
    const dataset = toDataset('name', `Ann${NBSP}`, `${NBSP}Bo`, 'Cy');

    const [issue] = findWhitespace(dataset);

    expect(issue?.rows).toEqual([0, 1]);
    expect(issue?.details).toEqual({
      kind: 'whitespace',
      paddedCount: 2,
      innerCount: 0,
      nonBreakingCount: 2,
    });
  });

  it('finds runs of spaces, tabs and non-breaking spaces inside a value', () => {
    const dataset = toDataset(
      'city',
      'San  Diego',
      `San${NBSP}Diego`,
      'San\tDiego',
      'San Diego'
    );

    const [issue] = findWhitespace(dataset);

    expect(issue?.rows).toEqual([0, 1, 2]);
    expect(issue?.details).toEqual({
      kind: 'whitespace',
      paddedCount: 0,
      innerCount: 3,
      nonBreakingCount: 1,
    });
    expect(cleanedValues({ dataset, issues: [issue ?? never()] })).toEqual([
      ['San Diego'],
      ['San Diego'],
      ['San Diego'],
      ['San Diego'],
    ]);
  });

  it('counts a cell that is padded and has a run inside under both', () => {
    const dataset = toDataset('city', ' San  Diego ');

    const [issue] = findWhitespace(dataset);

    expect(issue?.details).toEqual({
      kind: 'whitespace',
      paddedCount: 1,
      innerCount: 1,
      nonBreakingCount: 0,
    });
  });

  it('reports one issue per affected column and leaves clean columns alone', () => {
    const dataset = toDataset(
      'id,name,city',
      '1, Ann,Austin',
      '2,Bo,Boston ',
      '3,Cy,Dallas'
    );

    const issues = findWhitespace(dataset);

    expect(
      issues.map(({ id, column, rows }) => ({ id, column, rows }))
    ).toEqual([
      { id: toIssueId('whitespace:1'), column: 1, rows: [0] },
      { id: toIssueId('whitespace:2'), column: 2, rows: [1] },
    ]);
  });

  it('finds padding in any column, numbers and dates included', () => {
    const dataset = toDataset(
      'amount,joined',
      ' 12,2024-03-04',
      '7, 2024-03-05'
    );

    const issues = findWhitespace(dataset);

    expect(issues.map(({ column, rows }) => ({ column, rows }))).toEqual([
      { column: 0, rows: [0] },
      { column: 1, rows: [1] },
    ]);
  });

  it('lists a whitespace-only cell, because trimming empties it, and leaves an empty one alone', () => {
    const dataset = toDataset('name', ' ', `${NBSP}`, '\t', '', 'Ann');

    const issues = findWhitespace(dataset);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rows).toEqual([0, 1, 2]);
    expect(issues[0]?.details).toEqual({
      kind: 'whitespace',
      paddedCount: 3,
      innerCount: 0,
      nonBreakingCount: 1,
    });
    expect(listChangedRows({ dataset, issues })).toEqual([0, 1, 2]);
  });

  it('finds nothing when no value changes under normalization', () => {
    const dataset = toDataset(
      'id,name,note',
      '1,Ann Lee,a-b',
      '2,Bo,"two\nlines"',
      '3,日本語,ok'
    );

    expect(findWhitespace(dataset)).toEqual([]);
  });

  it('finds nothing in a file with one clean row', () => {
    expect(findWhitespace(toDataset('id,name', '1,Ann'))).toEqual([]);
  });

  it('treats the empty cells of a short row as clean', () => {
    const dataset = toDataset('id,name,city', '1', '2,Bo, Austin');

    const issues = findWhitespace(dataset);

    expect(issues.map(({ column, rows }) => ({ column, rows }))).toEqual([
      { column: 2, rows: [1] },
    ]);
  });

  it('finds a padded value whose trimmed form is also the name of another row', () => {
    const dataset = toDataset('name', 'Ann', ' Ann', 'Ann ');

    const [issue] = findWhitespace(dataset);

    expect(issue?.rows).toEqual([1, 2]);
  });

  it('reads every row once', () => {
    const rowCount = 50;
    const dataset = toDataset(
      'id,name',
      ...Array.from({ length: rowCount }, (_, index) => `${index}, x`)
    );
    const watched = watchRowReads(dataset);

    findWhitespaceIssues.find({
      dataset: watched.dataset,
      profile: profileDataset(dataset),
    });

    const rowReads = watched.reads.filter((property) => /^\d+$/.test(property));
    expect(rowReads).toHaveLength(rowCount);
  });
});

function findWhitespace(dataset: Dataset) {
  return findWhitespaceIssues.find({
    dataset,
    profile: profileDataset(dataset),
  });
}

function never(): never {
  throw new Error('Expected an issue');
}
