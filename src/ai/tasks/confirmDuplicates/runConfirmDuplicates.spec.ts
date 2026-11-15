import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completionOf, createFakeAiClient } from '../../testing/fakeAiClient';
import type { ConfirmDuplicatesRequest } from './confirmDuplicatesContract';
import { runConfirmDuplicates } from './runConfirmDuplicates';

const request: ConfirmDuplicatesRequest = {
  columns: ['name', 'email'],
  pairs: [
    {
      id: 0,
      rows: [1, 8],
      similarity: 0.97,
      evidence: {
        nameSimilarity: 0.97,
        agreeingColumns: [],
        sharedIdentifierColumns: [],
      },
      first: ['Ada Lovelace', 'ada@example.com'],
      second: ['Ada Lovelase', ''],
    },
  ],
};

function reply(claims: object): unknown {
  return completionOf({ content: JSON.stringify(claims) });
}

describe('runConfirmDuplicates', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the confirmed pairs, with the call recorded', async () => {
    const { client } = createFakeAiClient({
      reply: reply({
        pairs: [
          {
            id: 0,
            isDuplicate: true,
            confidence: 'high',
            reason: 'Same person, one typo.',
            keep: 'first',
            columnChoices: [],
          },
        ],
      }),
    });

    const outcome = await runConfirmDuplicates({ client, model: 'm', request });

    expect(outcome).toMatchObject({
      ok: true,
      result: {
        duplicates: [{ rows: [1, 8], keep: 'first' }],
        droppedClaims: 0,
      },
    });
    expect(outcome.calls).toMatchObject([
      { task: 'confirmDuplicates', outcome: 'valid' },
    ]);
  });

  it('drops a pair id that was never sent and counts it', async () => {
    const { client } = createFakeAiClient({
      reply: reply({
        pairs: [
          {
            id: 99,
            isDuplicate: true,
            confidence: 'high',
            reason: 'Made up.',
            keep: 'first',
            columnChoices: [],
          },
        ],
      }),
    });

    const outcome = await runConfirmDuplicates({ client, model: 'm', request });

    expect(outcome).toMatchObject({
      ok: true,
      result: { duplicates: [], claimCount: 1, droppedClaims: 1 },
    });
  });

  it('retries once on an invalid reply and then fails with invalidModelOutput', async () => {
    const { client, createChatCompletion } = createFakeAiClient(
      { reply: reply({ pairs: 'yes' }) },
      { reply: reply({ pairs: 'no' }) }
    );

    const outcome = await runConfirmDuplicates({ client, model: 'm', request });

    expect(createChatCompletion).toHaveBeenCalledTimes(2);
    expect(outcome).toMatchObject({ ok: false, reason: 'invalidModelOutput' });
  });

  it('asks for the response format of the reply contract', async () => {
    const { client, requests } = createFakeAiClient({
      reply: reply({ pairs: [] }),
    });

    await runConfirmDuplicates({ client, model: 'm', request });

    expect(requests()[0]).toMatchObject({
      response_format: {
        json_schema: {
          name: 'confirm_duplicates',
          strict: true,
          schema: { required: ['pairs'], additionalProperties: false },
        },
      },
    });
  });
});
