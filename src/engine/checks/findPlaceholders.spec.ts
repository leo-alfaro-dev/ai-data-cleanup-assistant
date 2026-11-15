import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { cleanedValues } from '@/engine/testing/cleanedValues';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findEmptyCells } from './findEmptyCells';
import { findPlaceholders } from './findPlaceholders';

const NBSP = ' ';

describe('findPlaceholders', () => {
  it('finds N/A as a high issue that maps it to empty, and leaves Nancy alone', () => {
    const dataset = toDataset(
      'id,name',
      '1,Ann',
      '2,N/A',
      '3,Nancy',
      '4,Bo',
      '5,Cy',
      '6,Di',
      '7,Ed',
      '8,Flo',
      '9,Gus',
      '10,Hal'
    );

    const issues = findPlaceholderIssues(dataset);

    expect(issues).toEqual([
      {
        id: toIssueId('placeholders:1'),
        category: 'missing',
        source: 'check',
        confidence: 'high',
        rows: [1],
        column: 1,
        suggestion: {
          kind: 'mapValues',
          column: toColumnKey(1),
          groups: [{ canonical: '', variants: ['N/A'] }],
        },
        details: {
          kind: 'placeholders',
          spellings: [{ value: 'N/A', count: 1 }],
          filledCount: 10,
        },
      },
    ]);
    expect(cleanedValues({ dataset, issues }).slice(0, 4)).toEqual([
      ['1', 'Ann'],
      ['2', ''],
      ['3', 'Nancy'],
      ['4', 'Bo'],
    ]);
  });

  it('finds a lone dash and leaves a negative number alone', () => {
    const dataset = toDataset('id,balance', '1,-', '2,-5', '3,--', '4,12');

    const issues = findPlaceholderIssues(dataset);

    expect(issues.map(({ rows }) => rows)).toEqual([[0, 2]]);
    expect(cleanedValues({ dataset, issues })).toEqual([
      ['1', ''],
      ['2', '-5'],
      ['3', ''],
      ['4', '12'],
    ]);
  });

  it('finds every listed placeholder', () => {
    const dataset = toDataset(
      'note',
      ...[
        'n/a',
        'na',
        'null',
        'none',
        'nil',
        '-',
        '--',
        '?',
        'unknown',
        'tbd',
        'missing',
      ],
      ...Array.from({ length: 100 }, (_, index) => `value ${index}`)
    );

    const [issue] = findPlaceholderIssues(dataset);

    expect(issue?.rows).toHaveLength(11);
  });

  it('lowers confidence to medium when none fills a third of a plan column', () => {
    const dataset = toDataset(
      'plan',
      'free',
      'none',
      'pro',
      'none',
      'team',
      'none',
      'free',
      'pro',
      'none'
    );

    const [issue] = findPlaceholderIssues(dataset);

    expect(issue?.confidence).toBe('medium');
    expect(issue?.rows).toEqual([1, 3, 5, 8]);
  });

  it('keeps high confidence at exactly 20% of the non-blank values', () => {
    const dataset = toDataset('plan', 'none', 'free', 'pro', 'team', 'free');

    const [issue] = findPlaceholderIssues(dataset);

    expect(issue?.confidence).toBe('high');
  });

  it('lowers confidence just above 20% of the non-blank values', () => {
    const dataset = toDataset(
      'plan',
      'none',
      'none',
      ...Array.from({ length: 8 }, (_, index) => `plan ${index}`),
      'none'
    );

    const [issue] = findPlaceholderIssues(dataset);

    expect(issue?.confidence).toBe('medium');
  });

  it('measures the share against the non-blank values, not every row', () => {
    const dataset = toDataset(
      'id,plan',
      '0,none',
      '1,none',
      '2,none',
      ...Array.from({ length: 7 }, (_, index) => `${index + 3},plan ${index}`),
      ...Array.from({ length: 10 }, (_, index) => `${index + 10},`)
    );

    const [issue] = findPlaceholderIssues(dataset);

    expect(issue?.confidence).toBe('medium');
    expect(issue?.details).toMatchObject({ filledCount: 10 });
  });

  it('finds a placeholder in a number column and in an email column', () => {
    const dataset = toDataset(
      'amount,email',
      '10,ann@example.com',
      'N/A,bo@example.com',
      '30,unknown',
      '40,cy@example.com',
      '50,di@example.com',
      '60,ed@example.com',
      '70,flo@example.com',
      '80,gus@example.com',
      '90,hal@example.com',
      '99,ivy@example.com'
    );

    const issues = findPlaceholderIssues(dataset);

    expect(issues.map(({ column, rows }) => ({ column, rows }))).toEqual([
      { column: 0, rows: [1] },
      { column: 1, rows: [2] },
    ]);
  });

  it('groups casing and spacing variants of one placeholder in one rule, by first appearance', () => {
    const dataset = toDataset(
      'plan',
      'N/A',
      'n/a',
      ' N/A ',
      'NA',
      'free',
      'n/a',
      'N/A',
      `N${NBSP}/A`
    );

    const [issue] = findPlaceholderIssues(dataset);

    expect(issue?.suggestion).toEqual({
      kind: 'mapValues',
      column: toColumnKey(0),
      groups: [{ canonical: '', variants: ['N/A', 'n/a', 'NA'] }],
    });
    expect(issue?.details).toMatchObject({
      spellings: [
        { value: 'N/A', count: 3 },
        { value: 'n/a', count: 2 },
        { value: 'NA', count: 1 },
      ],
    });
    expect(issue?.rows).toEqual([0, 1, 2, 3, 5, 6]);
    expect(cleanedValues({ dataset, issues: issue ? [issue] : [] })).toEqual([
      [''],
      [''],
      [''],
      [''],
      ['free'],
      [''],
      [''],
      [`N${NBSP}/A`],
    ]);
  });

  it('changes only the placeholder cells of its column', () => {
    const dataset = toDataset(
      'id,plan,city',
      '1,none,none',
      '2,free,N/A',
      '3, TBD ,Austin',
      '4,free,'
    );

    const issues = findPlaceholderIssues(dataset);

    expect(cleanedValues({ dataset, issues })).toEqual([
      ['1', '', ''],
      ['2', 'free', ''],
      ['3', '', 'Austin'],
      ['4', 'free', ''],
    ]);
  });

  it('does not treat blank cells as placeholders', () => {
    const dataset = toDataset('name', '', ' ', NBSP, 'Ann');

    expect(findPlaceholderIssues(dataset)).toEqual([]);
  });

  it('finds nothing in a file without placeholders', () => {
    const dataset = toDataset('id,name', '1,Ann', '2,Nancy', '3,Nathan');

    expect(findPlaceholderIssues(dataset)).toEqual([]);
  });

  it('works on a file with one column and one row', () => {
    const issues = findPlaceholderIssues(toDataset('name', 'unknown'));

    expect(
      issues.map(({ rows, confidence }) => ({ rows, confidence }))
    ).toEqual([{ rows: [0], confidence: 'medium' }]);
  });

  it('does not overlap with the empty-cells check on the same column', () => {
    const dataset = toDataset('id,plan', '1,', '2,N/A', '3,free', '4, ', '5,-');

    const placeholderRows = findPlaceholderIssues(dataset).flatMap(
      ({ rows }) => rows
    );
    const emptyRows = findEmptyCells
      .find({ dataset, profile: profileDataset(dataset) })
      .flatMap(({ rows }) => rows);

    expect(placeholderRows).toEqual([1, 4]);
    expect(emptyRows).toEqual([0, 3]);
  });

  it('reads every row once', () => {
    const rowCount = 50;
    const dataset = toDataset(
      'id,plan',
      ...Array.from({ length: rowCount }, (_, index) => `${index},N/A`)
    );
    const watched = watchRowReads(dataset);

    findPlaceholders.find({
      dataset: watched.dataset,
      profile: profileDataset(dataset),
    });

    const rowReads = watched.reads.filter((property) => /^\d+$/.test(property));
    expect(rowReads).toHaveLength(rowCount);
  });
});

function findPlaceholderIssues(dataset: Dataset) {
  return findPlaceholders.find({ dataset, profile: profileDataset(dataset) });
}
