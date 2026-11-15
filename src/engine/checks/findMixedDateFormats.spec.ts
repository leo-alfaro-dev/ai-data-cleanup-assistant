import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { cleanedValues } from '@/engine/testing/cleanedValues';
import { listChangedRows } from '@/engine/testing/listChangedRows';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findMixedDateFormats } from './findMixedDateFormats';

const ISO_DATES = ['2024-03-01', '2024-03-02', '2024-03-03', '2024-03-04'];

describe('findMixedDateFormats', () => {
  it('finds a column in several formats and suggests the one most cells use', () => {
    const dataset = toDataset(
      'joined',
      ...ISO_DATES,
      '03/25/2024',
      '"Mar 7, 2024"',
      '8 Mar 2024'
    );

    const issues = findMixed(dataset);

    expect(issues).toEqual([
      {
        id: toIssueId('mixed-date-formats:0'),
        category: 'inconsistent',
        source: 'check',
        confidence: 'high',
        rows: [4, 5, 6],
        column: 0,
        suggestion: {
          kind: 'standardizeDates',
          column: toColumnKey(0),
          format: 'YYYY-MM-DD',
        },
        details: {
          kind: 'mixedDateFormats',
          dominantFormat: 'YYYY-MM-DD',
          formatCounts: [
            { format: 'YYYY-MM-DD', count: 4 },
            { format: 'MM/DD/YYYY', count: 1 },
            { format: 'MMM D, YYYY', count: 1 },
            { format: 'D MMM YYYY', count: 1 },
          ],
          eitherOrderCount: 0,
          ambiguousRows: [],
        },
      },
    ]);
    expect(cleanedValues({ dataset, issues })).toEqual([
      ['2024-03-01'],
      ['2024-03-02'],
      ['2024-03-03'],
      ['2024-03-04'],
      ['2024-03-25'],
      ['2024-03-07'],
      ['2024-03-08'],
    ]);
  });

  it('lists an ambiguous slash date in the issue and leaves it untouched', () => {
    const dataset = toDataset(
      'joined',
      ...ISO_DATES,
      '03/04/2024',
      '04/03/2024',
      '13/03/2024'
    );

    const issues = findMixed(dataset);

    expect(issues[0]?.rows).toEqual([4, 5, 6]);
    expect(issues[0]?.details).toMatchObject({ ambiguousRows: [4, 5] });
    expect(cleanedValues({ dataset, issues }).slice(4)).toEqual([
      ['03/04/2024'],
      ['04/03/2024'],
      ['2024-03-13'],
    ]);
  });

  it('lists ambiguous dates without a suggestion when none could be rewritten', () => {
    const dataset = toDataset('joined', ...ISO_DATES, '03/04/2024');

    const issues = findMixed(dataset);

    expect(issues).toEqual([
      {
        id: toIssueId('mixed-date-formats:0'),
        category: 'inconsistent',
        source: 'check',
        confidence: 'high',
        rows: [4],
        column: 0,
        suggestion: null,
        details: {
          kind: 'mixedDateFormats',
          dominantFormat: 'YYYY-MM-DD',
          formatCounts: [{ format: 'YYYY-MM-DD', count: 4 }],
          eitherOrderCount: 0,
          ambiguousRows: [4],
        },
      },
    ]);
    expect(cleanedValues({ dataset, issues }).at(-1)).toEqual(['03/04/2024']);
  });

  it('does not call a column mixed when its certain format is a slash order and the rest is slash dates', () => {
    const dataset = toDataset(
      'joined',
      '03/25/2024',
      '04/17/2024',
      '05/22/2024',
      '03/04/2024',
      '03/03/2024'
    );

    expect(findMixed(dataset)).toEqual([]);
  });

  it('finds nothing when no cell has a certain format', () => {
    const dataset = toDataset(
      'joined',
      '03/04/2024',
      '05/06/2024',
      '07/08/2024'
    );

    expect(findMixed(dataset)).toEqual([]);
  });

  it('standardizes to a slash format when most cells use it, and does not claim a date that may already fit it', () => {
    const dataset = toDataset(
      'joined',
      '03/25/2024',
      '04/17/2024',
      '05/22/2024',
      '2024-06-30',
      '03/04/2024'
    );

    const issues = findMixed(dataset);

    expect(issues[0]?.rows).toEqual([3]);
    expect(issues[0]?.details).toMatchObject({ ambiguousRows: [] });
    expect(issues[0]?.suggestion).toEqual({
      kind: 'standardizeDates',
      column: 0,
      format: 'MM/DD/YYYY',
    });
    expect(cleanedValues({ dataset, issues }).slice(3)).toEqual([
      ['06/30/2024'],
      ['03/04/2024'],
    ]);
  });

  it('rewrites a date that both slash orders read as the same day to a format that is not a slash order', () => {
    const dataset = toDataset('joined', ...ISO_DATES, '03/03/2024');

    const issues = findMixed(dataset);

    expect(issues[0]?.rows).toEqual([4]);
    expect(issues[0]?.details).toMatchObject({
      eitherOrderCount: 1,
      ambiguousRows: [],
    });
    expect(cleanedValues({ dataset, issues }).at(-1)).toEqual(['2024-03-03']);
  });

  it('leaves that same date alone when the column uses a slash order', () => {
    const dataset = toDataset(
      'joined',
      '03/25/2024',
      '04/17/2024',
      '05/22/2024',
      '2024-06-30',
      '03/03/2024'
    );

    const issues = findMixed(dataset);

    expect(issues[0]?.rows).toEqual([3]);
    expect(cleanedValues({ dataset, issues }).at(-1)).toEqual(['03/03/2024']);
  });

  it('finds a column that mixes both slash orders and keeps the more common one', () => {
    const dataset = toDataset(
      'joined',
      '03/25/2024',
      '03/26/2024',
      '04/17/2024',
      '25/03/2024'
    );

    const issues = findMixed(dataset);

    expect(issues[0]?.rows).toEqual([3]);
    expect(issues[0]?.suggestion).toMatchObject({ format: 'MM/DD/YYYY' });
    expect(cleanedValues({ dataset, issues }).at(-1)).toEqual(['03/25/2024']);
  });

  it('lists an ambiguous date when the column uses both slash orders', () => {
    const dataset = toDataset(
      'joined',
      '03/25/2024',
      '03/26/2024',
      '25/03/2024',
      '03/04/2024'
    );

    const [issue] = findMixed(dataset);

    expect(issue?.rows).toEqual([2, 3]);
    expect(issue?.details).toMatchObject({ ambiguousRows: [3] });
  });

  it.each([
    {
      name: 'full month names beside the abbreviated style',
      lines: [
        '"March 4, 2024"',
        '"May 6, 2024"',
        '"June 1, 2024"',
        '2024-05-06',
      ],
      rows: [0, 2, 3],
    },
    {
      name: 'unpadded slash dates',
      lines: ['1/15/2024', '2/20/2024', '12/25/2024', '2024-05-06'],
      rows: [0, 1, 3],
    },
    {
      name: 'unpadded ISO dates',
      lines: ['2024-3-5', '2024-03-06', '2024-03-07', '03/25/2024'],
      rows: [0, 3],
    },
    {
      name: 'padded cells in the main format',
      lines: [' 2024-03-01', '2024-03-02', '2024-03-03', '03/25/2024'],
      rows: [0, 3],
    },
  ])(
    'lists exactly the cells the suggestion changes: $name',
    ({ lines, rows }) => {
      const dataset = toDataset('joined', ...lines);

      const issues = findMixed(dataset);

      expect(issues[0]?.rows).toEqual(rows);
      expect(listChangedRows({ dataset, issues })).toEqual(rows);
    }
  );

  it('breaks a tie in favour of the format seen first in the file', () => {
    const isoFirst = toDataset(
      'joined',
      '2024-03-01',
      '"Mar 4, 2024"',
      '2024-03-02',
      '"Mar 5, 2024"'
    );
    const namedFirst = toDataset(
      'joined',
      '"Mar 4, 2024"',
      '2024-03-01',
      '"Mar 5, 2024"',
      '2024-03-02'
    );

    const [fromIso] = findMixed(isoFirst);
    const [fromNamed] = findMixed(namedFirst);

    expect(fromIso?.suggestion).toMatchObject({ format: 'YYYY-MM-DD' });
    expect(fromIso?.rows).toEqual([1, 3]);
    expect(fromNamed?.suggestion).toMatchObject({ format: 'MMM D, YYYY' });
    expect(fromNamed?.rows).toEqual([1, 3]);
  });

  it('picks the most common format even when another comes first', () => {
    const dataset = toDataset('joined', '"Mar 4, 2024"', ...ISO_DATES);

    const [issue] = findMixed(dataset);

    expect(issue?.suggestion).toMatchObject({ format: 'YYYY-MM-DD' });
    expect(issue?.rows).toEqual([0]);
  });

  it('finds nothing in a column of slash dates in one order, written without leading zeros', () => {
    const dataset = toDataset(
      'joined',
      '1/15/2024',
      '3/15/2024',
      '12/25/2024',
      '1/1/2024',
      '2/3/2024',
      '6/30/2024'
    );

    expect(findMixed(dataset)).toEqual([]);
  });

  it('finds nothing in a column of unpadded ISO dates in one format', () => {
    const dataset = toDataset('joined', '2024-3-5', '2024-03-06', '2024-3-7');

    expect(findMixed(dataset)).toEqual([]);
  });

  it('finds nothing in a column that already uses one format', () => {
    const dataset = toDataset('joined', ...ISO_DATES);

    expect(findMixed(dataset)).toEqual([]);
  });

  it('counts padded dates by their format', () => {
    const dataset = toDataset(
      'joined',
      ' 2024-03-01',
      '2024-03-02 ',
      ...ISO_DATES
    );

    expect(findMixed(dataset)).toEqual([]);
  });

  it('leaves blank cells, placeholders and other text out of the rows', () => {
    const dataset = toDataset(
      'joined',
      ...ISO_DATES,
      ...ISO_DATES,
      '03/25/2024',
      '',
      ' ',
      'N/A'
    );

    const issues = findMixed(dataset);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rows).toEqual([8]);
  });

  it('ignores a column whose dominant type is not date', () => {
    const dataset = toDataset(
      'note',
      'alpha',
      'beta',
      'gamma',
      '2024-03-01',
      '03/25/2024'
    );

    expect(findMixed(dataset)).toEqual([]);
  });

  it('reports one issue per date column, each with its own id', () => {
    const dataset = toDataset(
      'id,joined,left',
      '1,2024-03-01,2024-04-01',
      '2,2024-03-02,2024-04-02',
      '3,03/25/2024,2024-04-03',
      '4,2024-03-04,04/17/2024'
    );

    const issues = findMixed(dataset);

    expect(
      issues.map(({ id, column, rows }) => ({ id, column, rows }))
    ).toEqual([
      { id: toIssueId('mixed-date-formats:1'), column: 1, rows: [2] },
      { id: toIssueId('mixed-date-formats:2'), column: 2, rows: [3] },
    ]);
  });

  it('finds nothing in a file with one row', () => {
    expect(findMixed(toDataset('joined', '2024-03-01'))).toEqual([]);
  });

  it('reads every row once', () => {
    const rowCount = 50;
    const dataset = toDataset(
      'id,joined',
      ...Array.from(
        { length: rowCount },
        (_, index) =>
          `${index},${index % 5 === 0 ? '03/25/2024' : '2024-03-04'}`
      )
    );
    const watched = watchRowReads(dataset);

    findMixedDateFormats.find({
      dataset: watched.dataset,
      profile: profileDataset(dataset),
    });

    const rowReads = watched.reads.filter((property) => /^\d+$/.test(property));
    expect(rowReads).toHaveLength(rowCount);
  });
});

function findMixed(dataset: Dataset) {
  return findMixedDateFormats.find({
    dataset,
    profile: profileDataset(dataset),
  });
}
