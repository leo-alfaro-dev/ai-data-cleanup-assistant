import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completionOf, createFakeAiClient } from '../../testing/fakeAiClient';
import type { AssessSuspiciousRowsRequest } from './assessSuspiciousRowsContract';
import { runAssessSuspiciousRows } from './runAssessSuspiciousRows';

const request: AssessSuspiciousRowsRequest = {
  columns: [
    {
      header: 'amount',
      type: 'decimal',
      distinctCount: 5,
      blankCount: 0,
      range: { minimum: 1, maximum: 9, median: 5 },
      topValues: [],
    },
  ],
  rows: [
    { id: 0, rowId: 3, flaggedBy: ['numeric-outliers:0'], cells: ['9999999'] },
    { id: 1, rowId: 8, flaggedBy: [], cells: ['4'] },
  ],
  isComplete: true,
};

function reply(claims: object): unknown {
  return completionOf({ content: JSON.stringify(claims) });
}

describe('runAssessSuspiciousRows', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the validated verdicts, with the call recorded', async () => {
    const { client } = createFakeAiClient({
      reply: reply({
        rows: [
          {
            id: 0,
            isSuspicious: true,
            column: 0,
            reason: 'Far above the range.',
            confidence: 'high',
            suggestedValue: null,
          },
          {
            id: 1,
            isSuspicious: false,
            column: null,
            reason: 'Ordinary.',
            confidence: 'high',
            suggestedValue: null,
          },
        ],
      }),
    });

    const outcome = await runAssessSuspiciousRows({
      client,
      model: 'm',
      request,
    });

    expect(outcome).toMatchObject({
      ok: true,
      result: {
        rows: [
          { rowId: 3, isSuspicious: true, flaggedBy: ['numeric-outliers:0'] },
          { rowId: 8, isSuspicious: false, flaggedBy: [] },
        ],
        droppedClaims: 0,
      },
    });
    expect(outcome.calls).toMatchObject([
      { task: 'assessSuspiciousRows', outcome: 'valid' },
    ]);
  });

  it('drops a verdict for a row that was never sent and counts it', async () => {
    const { client } = createFakeAiClient({
      reply: reply({
        rows: [
          {
            id: 99,
            isSuspicious: true,
            column: 0,
            reason: 'Made up.',
            confidence: 'high',
            suggestedValue: null,
          },
        ],
      }),
    });

    const outcome = await runAssessSuspiciousRows({
      client,
      model: 'm',
      request,
    });

    expect(outcome).toMatchObject({
      ok: true,
      result: { rows: [], claimCount: 1, droppedClaims: 1 },
    });
  });

  it('fails with invalidModelOutput after two replies that break the contract', async () => {
    const { client, createChatCompletion } = createFakeAiClient(
      { reply: reply({ rows: 'all fine' }) },
      { reply: reply({ rows: 'fine' }) }
    );

    const outcome = await runAssessSuspiciousRows({
      client,
      model: 'm',
      request,
    });

    expect(createChatCompletion).toHaveBeenCalledTimes(2);
    expect(outcome).toMatchObject({ ok: false, reason: 'invalidModelOutput' });
  });

  it('asks for a strict response format that needs every property, nullable ones included', async () => {
    const { client, requests } = createFakeAiClient({
      reply: reply({ rows: [] }),
    });

    await runAssessSuspiciousRows({ client, model: 'm', request });

    const body = requests()[0] as {
      response_format: {
        json_schema: {
          schema: { properties: { rows: { items: { required: string[] } } } };
        };
      };
    };
    expect(
      body.response_format.json_schema.schema.properties.rows.items.required
    ).toEqual([
      'id',
      'isSuspicious',
      'column',
      'reason',
      'confidence',
      'suggestedValue',
    ]);
  });
});
