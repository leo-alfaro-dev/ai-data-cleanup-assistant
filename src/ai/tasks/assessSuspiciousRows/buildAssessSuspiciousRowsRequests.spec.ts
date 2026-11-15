import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import {
  MAX_CELL_LENGTH,
  MAX_FLAGGING_ISSUES_PER_ROW,
  MAX_HEADER_LENGTH,
} from '../../textLimits';
import { buildAssessSuspiciousRowsRequests } from './buildAssessSuspiciousRowsRequests';
import {
  assessSuspiciousRowsRequest,
  MAX_COLUMNS_PER_ROW,
  MAX_FLAGGED_ROWS,
  MAX_SAMPLED_ROWS,
} from './assessSuspiciousRowsContract';

function flag(
  id: string,
  rows: number[],
  category: Issue['category'] = 'suspicious'
): Issue {
  return {
    id: toIssueId(id),
    category,
    source: 'check',
    confidence: 'medium',
    rows: rows.map(toRowId),
    column: toColumnKey(2),
    suggestion: null,
    details: { kind: 'invalidEmails' },
  };
}

function build({ lines, issues }: { lines: string[]; issues: Issue[] }) {
  const dataset = toDataset(...lines);

  return buildAssessSuspiciousRowsRequests({
    dataset,
    profile: profileDataset(dataset),
    issues,
  });
}

function fileOf(rowCount: number): string[] {
  return [
    'id,name,amount',
    ...Array.from(
      { length: rowCount },
      (_, index) => `${index},Person ${index % 7},${10 + (index % 50)}`
    ),
  ];
}

describe('buildAssessSuspiciousRowsRequests', () => {
  it('sends every row of a file small enough to fit, the flagged ones first', () => {
    const [request] = build({
      lines: fileOf(12),
      issues: [flag('numeric-outliers:2', [7])],
    });

    expect(request?.isComplete).toBe(true);
    expect(request?.rows.map(({ rowId }) => rowId)).toEqual([
      7, 0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11,
    ]);
    expect(request?.rows[0]).toMatchObject({
      id: 0,
      flaggedBy: ['numeric-outliers:2'],
      cells: ['7', 'Person 0', '17'],
    });
    expect(request?.rows[1]?.flaggedBy).toEqual([]);
    expect(assessSuspiciousRowsRequest.safeParse(request).success).toBe(true);
  });

  it('sends every row of a file with exactly as many rows as the two caps together', () => {
    const [request] = build({
      lines: fileOf(MAX_FLAGGED_ROWS + MAX_SAMPLED_ROWS),
      issues: [],
    });

    expect(request?.rows).toHaveLength(MAX_FLAGGED_ROWS + MAX_SAMPLED_ROWS);
    expect(request?.isComplete).toBe(true);
  });

  it('sends the flagged rows and a sample of the others for a larger file, and says it is not complete', () => {
    const flagged = Array.from({ length: 10 }, (_, index) => index * 11);
    const [request] = build({
      lines: fileOf(500),
      issues: [flag('numeric-outliers:2', flagged)],
    });

    expect(request?.isComplete).toBe(false);
    expect(request?.rows).toHaveLength(10 + MAX_SAMPLED_ROWS);
    expect(request?.rows.slice(0, 10).map(({ rowId }) => rowId)).toEqual(
      flagged
    );
    const sampled = request?.rows.slice(10) ?? [];
    expect(sampled.every(({ flaggedBy }) => flaggedBy.length === 0)).toBe(true);
    expect(sampled.some(({ rowId }) => flagged.includes(rowId))).toBe(false);
    expect(sampled.map(({ id }) => id)).toEqual(
      Array.from({ length: MAX_SAMPLED_ROWS }, (_, index) => index + 10)
    );
  });

  it('chooses the same sample for the same file', () => {
    const lines = fileOf(500);

    expect(build({ lines, issues: [] })).toEqual(build({ lines, issues: [] }));
  });

  it('sends at most the cap of flagged rows, the ones flagged most first', () => {
    const many = Array.from({ length: 70 }, (_, index) => index);
    const [request] = build({
      lines: fileOf(500),
      issues: [
        flag('numeric-outliers:2', many),
        flag('invalid-emails:1', [60, 61]),
      ],
    });

    const flaggedRows =
      request?.rows.filter(({ flaggedBy }) => flaggedBy.length > 0) ?? [];
    expect(flaggedRows).toHaveLength(MAX_FLAGGED_ROWS);
    expect(flaggedRows.slice(0, 2).map(({ rowId }) => rowId)).toEqual([60, 61]);
    expect(flaggedRows[0]?.flaggedBy).toEqual([
      'numeric-outliers:2',
      'invalid-emails:1',
    ]);
  });

  it('counts only suspicious-category issues as flags', () => {
    const [request] = build({
      lines: fileOf(12),
      issues: [flag('whitespace:1', [3], 'inconsistent')],
    });

    expect(request?.rows.every(({ flaggedBy }) => flaggedBy.length === 0)).toBe(
      true
    );
  });

  it('summarizes each column with its type, range and most common values', () => {
    const lines = [
      'plan,amount',
      ...Array.from(
        { length: 30 },
        (_, index) => `${index % 3 === 0 ? 'Pro' : 'Starter'},${index + 1}`
      ),
    ];

    const [request] = build({ lines, issues: [] });

    expect(request?.columns[0]).toMatchObject({
      header: 'plan',
      type: 'text',
      distinctCount: 2,
      range: null,
      topValues: [
        { value: 'Starter', count: 20 },
        { value: 'Pro', count: 10 },
      ],
    });
    expect(request?.columns[1]).toMatchObject({
      header: 'amount',
      type: 'integer',
      range: { minimum: 1, maximum: 30, median: 15.5 },
    });
  });

  it('sends no top values for a column whose values are all different', () => {
    const [request] = build({ lines: fileOf(30), issues: [] });

    expect(request?.columns[0]?.topValues).toEqual([]);
  });

  it('shortens a value longer than the cap and sends one as long as the cap whole', () => {
    const edge = 'e'.repeat(MAX_CELL_LENGTH);
    const long = 'l'.repeat(MAX_CELL_LENGTH + 30);

    const [request] = build({ lines: ['a,b', `${edge},${long}`], issues: [] });

    expect(request?.rows[0]?.cells).toEqual([
      edge,
      `${'l'.repeat(MAX_CELL_LENGTH)}…`,
    ]);
    expect(assessSuspiciousRowsRequest.safeParse(request).success).toBe(true);
  });

  it('shortens a header longer than the cap, so the request still passes its contract', () => {
    const header = 'h'.repeat(MAX_HEADER_LENGTH + 150);

    const [request] = build({ lines: [`${header},b`, 'x,y'], issues: [] });

    expect(request?.columns[0]?.header).toBe(
      `${'h'.repeat(MAX_HEADER_LENGTH)}…`
    );
    expect(assessSuspiciousRowsRequest.safeParse(request).success).toBe(true);
  });

  it('names at most the cap of check issues that flagged a row', () => {
    const issues = Array.from(
      { length: MAX_FLAGGING_ISSUES_PER_ROW + 5 },
      (_, index) => flag(`check:${index}`, [0])
    );

    const [request] = build({ lines: ['a', 'x'], issues });

    expect(request?.rows[0]?.flaggedBy).toHaveLength(
      MAX_FLAGGING_ISSUES_PER_ROW
    );
    expect(assessSuspiciousRowsRequest.safeParse(request).success).toBe(true);
  });

  it('rejects a row that does not hold one cell per column', () => {
    const [request] = build({ lines: ['a,b', 'x,y'], issues: [] });
    const [row] = request?.rows ?? [];
    if (!request || !row) throw new Error('Expected a request');

    const short = { ...request, rows: [{ ...row, cells: ['x'] }] };

    expect(assessSuspiciousRowsRequest.safeParse(short).success).toBe(false);
  });

  it('sends at most the cap of columns', () => {
    const headers = Array.from(
      { length: MAX_COLUMNS_PER_ROW + 4 },
      (_, index) => `c${index}`
    );
    const row = headers.map((_, index) => `v${index}`).join(',');

    const [request] = build({ lines: [headers.join(','), row], issues: [] });

    expect(request?.columns).toHaveLength(MAX_COLUMNS_PER_ROW);
    expect(request?.rows[0]?.cells).toHaveLength(MAX_COLUMNS_PER_ROW);
  });

  it('sends nothing for a dataset with no rows', () => {
    const dataset = { ...toDataset('a,b', 'x,y'), rows: [] };

    expect(
      buildAssessSuspiciousRowsRequests({
        dataset,
        profile: profileDataset(dataset),
        issues: [],
      })
    ).toEqual([]);
  });
});
