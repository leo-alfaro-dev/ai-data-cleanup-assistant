import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completionOf, createFakeAiClient } from '../../testing/fakeAiClient';
import type { NormalizeValuesRequest } from './normalizeValuesContract';
import { runNormalizeValues } from './runNormalizeValues';

const request: NormalizeValuesRequest = {
  column: { key: 6, header: 'state', dominantType: 'text' },
  values: [
    { value: 'CA', count: 40 },
    { value: 'Calif.', count: 5 },
    { value: 'California', count: 30 },
  ],
  isComplete: true,
};

function reply(claims: object): unknown {
  return completionOf({ content: JSON.stringify(claims) });
}

describe('runNormalizeValues', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('turns a valid reply into the validated groups, with the call recorded', async () => {
    const { client } = createFakeAiClient({
      reply: reply({
        groups: [
          {
            canonical: 'California',
            variants: ['CA', 'Calif.', 'California'],
            reason: 'Spellings of one state.',
            confidence: 'high',
          },
        ],
        placeholders: [],
      }),
    });

    const outcome = await runNormalizeValues({
      client,
      model: 'test/model',
      request,
    });

    expect(outcome).toMatchObject({
      ok: true,
      result: {
        groups: [{ canonical: 'California', variants: ['CA', 'Calif.'] }],
        claimCount: 4,
        droppedClaims: 0,
      },
    });
    expect(outcome.calls).toMatchObject([
      { task: 'normalizeValues', model: 'test/model', outcome: 'valid' },
    ]);
  });

  it('drops a variant that was not sent and counts it, the rest of the group staying', async () => {
    const { client } = createFakeAiClient({
      reply: reply({
        groups: [
          {
            canonical: 'California',
            variants: ['CA', 'Cali', 'California'],
            reason: 'Spellings of one state.',
            confidence: 'medium',
          },
        ],
        placeholders: [],
      }),
    });

    const outcome = await runNormalizeValues({ client, model: 'm', request });

    expect(outcome).toMatchObject({
      ok: true,
      result: {
        groups: [{ variants: ['CA'] }],
        claimCount: 4,
        droppedClaims: 1,
      },
    });
  });

  it('retries once when the reply does not match the contract', async () => {
    const { client, createChatCompletion } = createFakeAiClient(
      { reply: reply({ groups: 'CA' }) },
      { reply: reply({ groups: [], placeholders: [] }) }
    );

    const outcome = await runNormalizeValues({ client, model: 'm', request });

    expect(createChatCompletion).toHaveBeenCalledTimes(2);
    expect(outcome).toMatchObject({ ok: true, result: { groups: [] } });
    expect(outcome.calls).toHaveLength(2);
  });

  it('fails with invalidModelOutput after two bad replies, keeping both calls', async () => {
    const { client } = createFakeAiClient(
      { reply: reply({ nope: 1 }) },
      { reply: reply({ nope: 2 }) }
    );

    const outcome = await runNormalizeValues({ client, model: 'm', request });

    expect(outcome).toMatchObject({ ok: false, reason: 'invalidModelOutput' });
    expect(outcome.calls).toHaveLength(2);
  });

  it('passes a provider failure on as its reason', async () => {
    const { client } = createFakeAiClient({
      failure: { kind: 'http', status: 402, payload: {} },
    });

    const outcome = await runNormalizeValues({ client, model: 'm', request });

    expect(outcome).toMatchObject({ ok: false, reason: 'budgetExhausted' });
  });
});
