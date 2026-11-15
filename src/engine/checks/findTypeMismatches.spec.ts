import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { findTypeMismatches } from './findTypeMismatches';

describe('findTypeMismatches', () => {
  it('finds a word in a number column as a medium issue with no suggestion', () => {
    const dataset = toDataset(
      'id,amount',
      ...numbers(9).map((number, index) => `${index},${number}`),
      '9,twelve'
    );

    const issues = findMismatches(dataset);

    expect(issues).toEqual([
      {
        id: toIssueId('type-mismatches:1'),
        category: 'inconsistent',
        source: 'check',
        confidence: 'medium',
        rows: [9],
        column: 1,
        suggestion: null,
        details: {
          kind: 'typeMismatches',
          expectedType: 'integer',
          mismatches: [{ type: 'text', count: 1 }],
        },
      },
    ]);
  });

  it('does not count N/A, null, a dash or a padded placeholder in a number column', () => {
    const dataset = toDataset(
      'amount',
      ...numbers(30),
      'twelve',
      'N/A',
      'null',
      '-',
      ' unknown ',
      'TBD'
    );

    const issues = findMismatches(dataset);

    expect(issues.map(({ rows }) => rows)).toEqual([[30]]);
  });

  it('finds nothing when the only deviations are placeholders', () => {
    const dataset = toDataset('amount', ...numbers(12), 'N/A', 'none', '?');

    expect(findMismatches(dataset)).toEqual([]);
  });

  it('treats integers and decimals as one numeric family', () => {
    const dataset = toDataset(
      'amount',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7.5',
      '8.25',
      '9',
      '10',
      'twelve'
    );

    const issues = findMismatches(dataset);

    expect(issues.map(({ rows }) => rows)).toEqual([[10]]);
    expect(issues[0]?.details).toMatchObject({
      expectedType: 'decimal',
      mismatches: [{ type: 'text', count: 1 }],
    });
  });

  it('does not report a phone number written without punctuation in a phone column', () => {
    const dataset = toDataset(
      'phone',
      ...Array.from(
        { length: 20 },
        (_, index) => `(212) 555-01${String(index).padStart(2, '0')}`
      ),
      '6125550140',
      '12',
      'call me',
      '2024-03-05',
      '1234.5678'
    );

    const issues = findMismatches(dataset);

    expect(issues.map(({ rows }) => rows)).toEqual([[21, 22, 23, 24]]);
    expect(issues[0]?.details).toMatchObject({ expectedType: 'phone' });
  });

  it('names a decimal column by its dominant type and counts each deviating type', () => {
    const dataset = toDataset(
      'amount',
      ...numbers(20).map((number) => `${number}.5`),
      '2024-03-04',
      'ada@example.com',
      'ada@example.org',
      'abc'
    );

    const [issue] = findMismatches(dataset);

    expect(issue?.rows).toEqual([20, 21, 22, 23]);
    expect(issue?.details).toEqual({
      kind: 'typeMismatches',
      expectedType: 'decimal',
      mismatches: [
        { type: 'email', count: 2 },
        { type: 'date', count: 1 },
        { type: 'text', count: 1 },
      ],
    });
  });

  it('finds values of another type in date, boolean, phone and url columns', () => {
    const dataset = toDataset(
      'joined,active,phone,site',
      ...Array.from(
        { length: 9 },
        () => `2024-03-04,yes,555-0123456,https://a.example.com`
      ),
      '12,maybe,hello,hello'
    );

    const issues = findMismatches(dataset);

    expect(
      issues.map(({ column, rows, details }) => ({
        column,
        rows,
        expectedType:
          details.kind === 'typeMismatches' ? details.expectedType : null,
      }))
    ).toEqual([
      { column: 0, rows: [9], expectedType: 'date' },
      { column: 1, rows: [9], expectedType: 'boolean' },
      { column: 2, rows: [9], expectedType: 'phone' },
      { column: 3, rows: [9], expectedType: 'url' },
    ]);
  });

  it('does not treat an ambiguous slash date as a mismatch in a date column', () => {
    const dataset = toDataset(
      'joined',
      ...Array.from({ length: 9 }, (_, index) => `2024-03-0${index + 1}`),
      '03/04/2024'
    );

    expect(findMismatches(dataset)).toEqual([]);
  });

  it('leaves blank cells and short rows out', () => {
    const dataset = toDataset(
      'id,amount',
      ...numbers(10).map((number, index) => `${index},${number}`),
      '10,',
      '11, ',
      '12'
    );

    expect(findMismatches(dataset)).toEqual([]);
  });

  it('leaves email columns to the invalid-email check', () => {
    const dataset = toDataset(
      'email',
      ...Array.from({ length: 9 }, (_, index) => `a${index}@example.com`),
      'not an email'
    );

    expect(findMismatches(dataset)).toEqual([]);
  });

  it('ignores text, mixed and empty columns, which have no type to deviate from', () => {
    const dataset = toDataset(
      'note,mixed,empty',
      'alpha,1,',
      'beta,2,',
      'gamma,3,',
      '4,b,',
      'delta,c,',
      'epsilon,d,'
    );

    expect(findMismatches(dataset)).toEqual([]);
  });

  it('reports one issue per column, each with its own id and rows in file order', () => {
    const dataset = toDataset(
      'amount,quantity',
      ...numbers(10).map((number) => `${number},${number}`),
      'many,3',
      '5,lots'
    );

    const issues = findMismatches(dataset);

    expect(
      issues.map(({ id, column, rows }) => ({ id, column, rows }))
    ).toEqual([
      { id: toIssueId('type-mismatches:0'), column: 0, rows: [10] },
      { id: toIssueId('type-mismatches:1'), column: 1, rows: [11] },
    ]);
  });

  it('finds nothing in a column where every value has the dominant type', () => {
    const dataset = toDataset('amount', ...numbers(10));

    expect(findMismatches(dataset)).toEqual([]);
  });

  it('finds nothing in a file with one row', () => {
    expect(findMismatches(toDataset('amount', '12'))).toEqual([]);
  });

  it('reads every row once', () => {
    const rowCount = 50;
    const dataset = toDataset(
      'amount,joined',
      ...Array.from({ length: rowCount }, (_, index) =>
        index === 7 ? 'x,2024-03-04' : `${index},2024-03-04`
      )
    );
    const watched = watchRowReads(dataset);

    findTypeMismatches.find({
      dataset: watched.dataset,
      profile: profileDataset(dataset),
    });

    const rowReads = watched.reads.filter((property) => /^\d+$/.test(property));
    expect(rowReads).toHaveLength(rowCount);
  });
});

function numbers(count: number): string[] {
  return Array.from({ length: count }, (_, index) => String(index + 1));
}

function findMismatches(dataset: Dataset) {
  return findTypeMismatches.find({
    dataset,
    profile: profileDataset(dataset),
  });
}
