// cspell:ignore exmaple exampel
import { describe, expect, it } from 'vitest';
import type { ColumnKey } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import type { IssueDetails } from '@/engine/issues/issueDetails';
import { toIssueId } from '@/engine/issues/toIssueId';
import { describeIssue } from './issueCopy';

const email = toColumnKey(1);
const columns = [
  { key: toColumnKey(0), header: 'name' },
  { key: email, header: 'email' },
  { key: toColumnKey(2), header: '' },
];

describe('describeIssue', () => {
  it.each<{
    name: string;
    details: IssueDetails;
    rowCount?: number;
    column?: ColumnKey | null;
    title: string;
    summary: string;
  }>([
    {
      name: 'exact duplicates',
      details: { kind: 'exactDuplicates', groups: [[toRowId(0), toRowId(1)]] },
      column: null,
      title: 'Exact duplicate rows',
      summary: '1 group of identical rows. The first row of each group stays.',
    },
    {
      name: 'normalized duplicates',
      details: {
        kind: 'normalizedDuplicates',
        groups: [
          [toRowId(0), toRowId(1)],
          [toRowId(2), toRowId(3)],
        ],
      },
      column: null,
      title: 'Duplicate rows that differ in spacing or case',
      summary:
        '2 groups of rows that match once spacing and case are ignored. The first row of each group stays.',
    },
    {
      name: 'shared identifiers',
      details: {
        kind: 'sharedIdentifiers',
        links: [{ column: email, value: 'a@example.com', rows: [] }],
        hasConflictingNames: false,
      },
      rowCount: 2,
      column: null,
      title: 'Rows share “email”',
      summary: 'Same email “a@example.com”.',
    },
    {
      name: 'shared identifiers whose names differ',
      details: {
        kind: 'sharedIdentifiers',
        links: [{ column: email, value: 'a@example.com', rows: [] }],
        hasConflictingNames: true,
      },
      rowCount: 2,
      column: null,
      title: 'Rows share “email”',
      summary:
        'Same email “a@example.com”. Their names differ, so no merge is suggested.',
    },
    {
      name: 'casing variants',
      details: { kind: 'casingVariants', groups: [] },
      title: 'Inconsistent casing in “email”',
      summary: 'Variants of 0 values. Each moves to its most common spelling.',
    },
    {
      name: 'mixed date formats with an ambiguous date',
      details: {
        kind: 'mixedDateFormats',
        dominantFormat: 'YYYY-MM-DD',
        formatCounts: [
          { format: 'YYYY-MM-DD', count: 20 },
          { format: 'MMM D, YYYY', count: 3 },
        ],
        eitherOrderCount: 0,
        ambiguousRows: [toRowId(4)],
      },
      title: 'Mixed date formats in “email”',
      summary:
        'Most dates are written YYYY-MM-DD. Other formats: 3 dates. Could be read two ways and left as written: 1 date.',
    },
    {
      name: 'type mismatches',
      details: {
        kind: 'typeMismatches',
        expectedType: 'integer',
        mismatches: [
          { type: 'text', count: 3 },
          { type: 'date', count: 1 },
        ],
      },
      title: 'Values of the wrong type in “email”',
      summary: 'The column is mostly integer values. Others: 3 text, 1 date.',
    },
    {
      name: 'whitespace',
      details: {
        kind: 'whitespace',
        paddedCount: 4,
        innerCount: 0,
        nonBreakingCount: 2,
      },
      title: 'Extra spaces in “email”',
      summary: '4 padded, 2 with non-breaking spaces.',
    },
    {
      name: 'empty cells',
      details: { kind: 'emptyCells', filledCount: 97 },
      rowCount: 3,
      title: 'Empty cells in “email”',
      summary: 'Empty: 3 of 100 cells.',
    },
    {
      name: 'placeholders, with the spellings beyond the third counted',
      details: {
        kind: 'placeholders',
        spellings: [
          { value: 'N/A', count: 4 },
          { value: '-', count: 2 },
          { value: 'null', count: 1 },
          { value: 'tbd', count: 1 },
          { value: 'unknown', count: 1 },
        ],
        filledCount: 90,
      },
      title: 'Placeholder values in “email”',
      summary:
        'Spellings of a missing value: “N/A” (4), “-” (2), “null” (1), and 2 more.',
    },
    {
      name: 'numeric outliers',
      details: {
        kind: 'numericOutliers',
        median: 49.5,
        lowerLimit: -1200.256,
        upperLimit: 1300,
      },
      rowCount: 2,
      title: 'Unusual numbers in “email”',
      summary:
        'The typical value is 49.5. Outside -1,200.26 to 1,300: 2 values.',
    },
    {
      name: 'negative values',
      details: { kind: 'negativeValues', median: 20 },
      title: 'Negative numbers in “email”',
      summary: 'The column is otherwise positive, with a typical value of 20.',
    },
    {
      name: 'invalid emails',
      details: { kind: 'invalidEmails' },
      rowCount: 1,
      title: 'Invalid email addresses in “email”',
      summary: 'These values do not look like an email address.',
    },
    {
      name: 'email domain typos',
      details: {
        kind: 'emailDomainTypos',
        corrections: [
          {
            domain: 'exmaple.com',
            correctedDomain: 'example.com',
            count: 2,
          },
          { domain: 'exampel.com', correctedDomain: 'example.com', count: 1 },
        ],
      },
      title: 'Misspelled email domains in “email”',
      summary:
        'Domain corrections: “exmaple.com” to “example.com”, and 1 more. The rest of each address stays.',
    },
    {
      name: 'formula-like values',
      details: { kind: 'formulaLikeValues', leadingCharacters: ['=', '@'] },
      rowCount: 2,
      title: 'Formula-like values in “email”',
      summary:
        'Starts with “=”, “@”, which a spreadsheet can run as a formula.',
    },
    {
      name: 'ragged rows',
      details: {
        kind: 'raggedRows',
        headerCellCount: 5,
        shortRowCount: 2,
        longRowCount: 1,
      },
      column: null,
      title: 'Rows with the wrong number of cells',
      summary: 'The header has 5 cells. Short rows: 2. Long rows: 1.',
    },
    {
      name: 'empty headers, naming the column by its number',
      details: { kind: 'emptyHeaders', columns: [toColumnKey(2)] },
      column: null,
      title: 'Empty column headers',
      summary: 'Columns with no header: Column 3.',
    },
    {
      name: 'repeated headers',
      details: {
        kind: 'repeatedHeaders',
        groups: [[toColumnKey(0), toColumnKey(1)]],
      },
      column: null,
      title: 'Repeated column headers',
      summary: 'Headers used on more than one column: 1.',
    },
    {
      name: 'blank rows',
      details: { kind: 'blankRows' },
      rowCount: 2,
      column: null,
      title: 'Blank rows',
      summary: 'Rows with no values: 2.',
    },
    {
      name: 'skipped blank lines',
      details: { kind: 'skippedBlankLines', count: 3 },
      column: null,
      title: 'Blank lines in the file',
      summary: '3 blank lines skipped when reading the file.',
    },
  ])(
    'words $name',
    ({ details, rowCount = 0, column = email, title, summary }) => {
      const issue = toIssue({ details, rowCount, column });

      expect(describeIssue({ issue, columns })).toEqual({ title, summary });
    }
  );

  it('names an unnamed column by its number', () => {
    const issue = toIssue({
      details: { kind: 'invalidEmails' },
      rowCount: 2,
      column: toColumnKey(2),
    });

    expect(describeIssue({ issue, columns }).title).toBe(
      'Invalid email addresses in “Column 3”'
    );
  });
});

function toIssue({
  details,
  rowCount,
  column,
}: {
  details: IssueDetails;
  rowCount: number;
  column: ColumnKey | null;
}): Issue {
  return {
    id: toIssueId('issue'),
    category: 'suspicious',
    source: 'check',
    confidence: 'high',
    rows: Array.from({ length: rowCount }, (_, index) => toRowId(index)),
    column,
    suggestion: null,
    details,
  };
}
