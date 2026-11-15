import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findStructuralIssues } from './findStructuralIssues';

describe('findStructuralIssues', () => {
  it('lists short and long rows as one issue that counts each', () => {
    const dataset = toDataset('a,b,c', '1,2,3', '1,2', '1,2,3,4', '1');

    expect(findStructure(dataset)).toEqual([
      {
        id: toIssueId('structure:ragged-rows'),
        category: 'suspicious',
        source: 'check',
        confidence: 'certain',
        rows: [1, 2, 3],
        column: null,
        suggestion: null,
        details: {
          kind: 'raggedRows',
          headerCellCount: 3,
          shortRowCount: 2,
          longRowCount: 1,
        },
      },
    ]);
  });

  it('reports an empty header, whitespace-only ones included, by column', () => {
    const dataset = toDataset('a,,c, , ', '1,2,3,4,5');

    expect(findStructure(dataset)).toEqual([
      {
        id: toIssueId('structure:empty-headers'),
        category: 'suspicious',
        source: 'check',
        confidence: 'certain',
        rows: [],
        column: null,
        suggestion: null,
        details: { kind: 'emptyHeaders', columns: [1, 3, 4] },
      },
    ]);
  });

  it('reports a header cell left empty by a trailing delimiter', () => {
    const dataset = toDataset('a,b,', '1,2,3');

    expect(detailsOf(dataset)).toEqual([
      { kind: 'emptyHeaders', columns: [2] },
    ]);
  });

  it('does not call the cells past the header an empty header', () => {
    const dataset = toDataset('a,b', '1,2,3,4');

    expect(findStructure(dataset).map(({ id }) => id)).toEqual([
      'structure:ragged-rows',
    ]);
    expect(detailsOf(dataset)).toEqual([
      {
        kind: 'raggedRows',
        headerCellCount: 2,
        shortRowCount: 0,
        longRowCount: 1,
      },
    ]);
  });

  it('groups repeated headers, whatever their casing or spacing', () => {
    const dataset = toDataset(
      'Email, email ,name,NAME,id,EMAIL',
      '1,2,3,4,5,6'
    );

    expect(findStructure(dataset)).toEqual([
      {
        id: toIssueId('structure:repeated-headers'),
        category: 'suspicious',
        source: 'check',
        confidence: 'certain',
        rows: [],
        column: null,
        suggestion: null,
        details: {
          kind: 'repeatedHeaders',
          groups: [
            [0, 1, 5],
            [2, 3],
          ],
        },
      },
    ]);
  });

  it('does not treat empty headers as repeats of each other', () => {
    const dataset = toDataset('a,,,d', '1,2,3,4');

    expect(findStructure(dataset).map(({ id }) => id)).toEqual([
      'structure:empty-headers',
    ]);
  });

  it('lists rows with every cell blank, whatever the blank characters', () => {
    const dataset = toDataset('a,b', '1,2', ',', ' ,\t', ' ,', '3,');

    expect(findStructure(dataset)).toEqual([
      {
        id: toIssueId('structure:blank-rows'),
        category: 'suspicious',
        source: 'check',
        confidence: 'certain',
        rows: [1, 2, 3],
        column: null,
        suggestion: null,
        details: { kind: 'blankRows' },
      },
    ]);
  });

  it('lists a blank row that is also ragged under both issues', () => {
    const dataset = toDataset('a,b,c', '1,2,3', ',');

    expect(
      findStructure(dataset).map(({ id, rows }) => ({ id, rows }))
    ).toEqual([
      { id: toIssueId('structure:ragged-rows'), rows: [1] },
      { id: toIssueId('structure:blank-rows'), rows: [1] },
    ]);
  });

  it('reports the blank lines the parser skipped, which have no row', () => {
    const dataset = toDataset('a,b', '1,2', '', '', '3,4');

    expect(findStructure(dataset)).toEqual([
      {
        id: toIssueId('structure:skipped-blank-lines'),
        category: 'suspicious',
        source: 'check',
        confidence: 'certain',
        rows: [],
        column: null,
        suggestion: null,
        details: { kind: 'skippedBlankLines', count: 2 },
      },
    ]);
  });

  it('does not count the line break that ends the file', () => {
    expect(findStructure(toDataset('a,b', '1,2', ''))).toEqual([]);
  });

  it('reports every kind it finds, headers first', () => {
    const dataset = toDataset('a,a,', '1,2,3', '', ',', '1,2,3,4');

    expect(findStructure(dataset).map(({ id }) => id)).toEqual([
      'structure:empty-headers',
      'structure:repeated-headers',
      'structure:ragged-rows',
      'structure:blank-rows',
      'structure:skipped-blank-lines',
    ]);
  });

  it('finds nothing in a clean file', () => {
    const dataset = toDataset('id,name', '1,Ada', '2,Bo', '3,');

    expect(findStructure(dataset)).toEqual([]);
  });

  it('finds nothing in a file with one column and one row', () => {
    expect(findStructure(toDataset('a', 'x'))).toEqual([]);
  });

  it('reads each row once', () => {
    const rowCount = 50;
    const dataset = toDataset(
      'a,b',
      ...Array.from({ length: rowCount }, (_, index) => `${index},x`)
    );
    const watched = watchRowReads(dataset);

    findStructuralIssues.find({
      dataset: watched.dataset,
      profile: profileDataset(dataset),
    });

    const rowReads = watched.reads.filter((property) => /^\d+$/.test(property));
    expect(rowReads).toHaveLength(rowCount);
  });
});

function findStructure(dataset: Dataset) {
  return findStructuralIssues.find({
    dataset,
    profile: profileDataset(dataset),
  });
}

function detailsOf(dataset: Dataset) {
  return findStructure(dataset).map(({ details }) => details);
}
