import { describe, expect, it } from 'vitest';
import type {
  AssessSuspiciousRowsReply,
  AssessSuspiciousRowsRequest,
} from './assessSuspiciousRowsContract';
import { MAX_CELL_LENGTH, MAX_REASON_LENGTH } from '../../textLimits';
import { validateAssessSuspiciousRows } from './validateAssessSuspiciousRows';

const request: AssessSuspiciousRowsRequest = {
  columns: [
    {
      header: 'name',
      type: 'text',
      distinctCount: 3,
      blankCount: 0,
      range: null,
      topValues: [],
    },
    {
      header: 'email',
      type: 'email',
      distinctCount: 3,
      blankCount: 0,
      range: null,
      topValues: [],
    },
  ],
  rows: [
    {
      id: 0,
      rowId: 14,
      flaggedBy: ['invalid-emails:1'],
      cells: ['Ada', 'ada.example.com'],
    },
    { id: 1, rowId: 30, flaggedBy: [], cells: ['Bo', 'bo@example.com'] },
  ],
  isComplete: false,
};

function verdict(
  partial: Partial<AssessSuspiciousRowsReply['rows'][number]> & { id: number }
): AssessSuspiciousRowsReply['rows'][number] {
  return {
    isSuspicious: true,
    column: 1,
    reason: 'No at sign.',
    confidence: 'high',
    suggestedValue: null,
    ...partial,
  };
}

function validate(...rows: AssessSuspiciousRowsReply['rows']) {
  return validateAssessSuspiciousRows({ request, reply: { rows } });
}

describe('validateAssessSuspiciousRows', () => {
  it('keeps a verdict for a row that was sent, with the row id and the flags it was sent with', () => {
    const result = validate(verdict({ id: 0 }));

    expect(result).toEqual({
      rows: [
        {
          rowId: 14,
          flaggedBy: ['invalid-emails:1'],
          isSuspicious: true,
          column: 1,
          reason: 'No at sign.',
          confidence: 'high',
          suggestedValue: null,
        },
      ],
      claimCount: 1,
      droppedClaims: 0,
    });
  });

  it('drops a verdict for a row that was not sent, and counts it', () => {
    const result = validate(verdict({ id: 9 }), verdict({ id: 1 }));

    expect(result.rows.map(({ rowId }) => rowId)).toEqual([30]);
    expect(result).toMatchObject({ claimCount: 2, droppedClaims: 1 });
  });

  it('answers a row once: the first verdict counts and a repeat is dropped', () => {
    const result = validate(
      verdict({ id: 1, reason: 'first' }),
      verdict({ id: 1, reason: 'second' })
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.reason).toBe('first');
    expect(result.droppedClaims).toBe(1);
  });

  it('drops a verdict that names a column that was not sent', () => {
    const result = validate(
      verdict({ id: 0, column: 2 }),
      verdict({ id: 1, column: -1 })
    );

    expect(result.rows).toEqual([]);
    expect(result).toMatchObject({ claimCount: 2, droppedClaims: 2 });
  });

  it('keeps a verdict with no column, for a problem that is the whole row', () => {
    const result = validate(verdict({ id: 1, column: null }));

    expect(result.rows[0]?.column).toBeNull();
    expect(result.droppedClaims).toBe(0);
  });

  it('keeps a suggested value that comes with a suspicious verdict that names a column', () => {
    const result = validate(
      verdict({ id: 0, suggestedValue: 'ada@example.com' })
    );

    expect(result.rows[0]?.suggestedValue).toBe('ada@example.com');
    expect(result).toMatchObject({ claimCount: 2, droppedClaims: 0 });
  });

  it('drops a suggested value from a verdict that is not suspicious, keeping the verdict', () => {
    const result = validate(
      verdict({ id: 0, isSuspicious: false, suggestedValue: 'x@example.com' })
    );

    expect(result.rows[0]).toMatchObject({
      isSuspicious: false,
      suggestedValue: null,
    });
    expect(result.droppedClaims).toBe(1);
  });

  it('drops a suggested value when no column stands out', () => {
    const result = validate(
      verdict({ id: 0, column: null, suggestedValue: 'x@example.com' })
    );

    expect(result.rows[0]?.suggestedValue).toBeNull();
    expect(result.droppedClaims).toBe(1);
  });

  it.each([
    ['blank', '   '],
    ['empty', ''],
    ['too long', 'x'.repeat(MAX_CELL_LENGTH + 1)],
    ['what the cell holds already', 'ada.example.com'],
    ['the start of a formula', '=HYPERLINK("http://example.com")'],
    ['the start of a formula after spaces', '  @SUM(A1)'],
  ])('drops a suggested value that is %s', (_name, suggestedValue) => {
    const result = validate(verdict({ id: 0, suggestedValue }));

    expect(result.rows[0]?.suggestedValue).toBeNull();
    expect(result.droppedClaims).toBe(1);
  });

  it('cuts a reason longer than the cap', () => {
    const result = validate(
      verdict({ id: 0, reason: 'r'.repeat(MAX_REASON_LENGTH + 50) })
    );

    expect(result.rows[0]?.reason).toBe(`${'r'.repeat(MAX_REASON_LENGTH)}…`);
  });

  it('keeps a suggested value as long as the cap', () => {
    const edge = 'e'.repeat(MAX_CELL_LENGTH);

    const result = validate(verdict({ id: 0, suggestedValue: edge }));

    expect(result.rows[0]?.suggestedValue).toBe(edge);
  });

  it('returns nothing, with nothing counted, for an empty reply', () => {
    expect(validate()).toEqual({ rows: [], claimCount: 0, droppedClaims: 0 });
  });
});
