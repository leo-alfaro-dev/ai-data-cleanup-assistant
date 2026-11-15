import { describe, expect, it } from 'vitest';
import { toAiFailureReason } from './toAiFailureReason';

describe('toAiFailureReason', () => {
  it.each([
    [401, 'invalidKey'],
    [402, 'budgetExhausted'],
    [408, 'timeout'],
    [429, 'rateLimited'],
    [404, 'modelUnavailable'],
    [502, 'modelUnavailable'],
    [503, 'modelUnavailable'],
    [500, 'unexpected'],
    [504, 'unexpected'],
    [400, 'unexpected'],
  ])('maps status %i to %s', (status, reason) => {
    expect(toAiFailureReason({ kind: 'http', status, payload: {} })).toBe(
      reason
    );
  });

  it('maps a 403 that names a spent limit to budgetExhausted', () => {
    const payload = {
      error: {
        code: 403,
        message: 'Budget limit exceeded',
        metadata: { limit_source: 'openrouter_key_limit' },
      },
    };

    expect(toAiFailureReason({ kind: 'http', status: 403, payload })).toBe(
      'budgetExhausted'
    );
  });

  it('maps any other 403, such as a guardrail block, to unexpected', () => {
    const payload = {
      error: {
        code: 403,
        message: 'Request blocked',
        metadata: { patterns: [] },
      },
    };

    expect(toAiFailureReason({ kind: 'http', status: 403, payload })).toBe(
      'unexpected'
    );
    expect(
      toAiFailureReason({ kind: 'http', status: 403, payload: null })
    ).toBe('unexpected');
  });

  it('maps a timeout to timeout and a network failure to unexpected', () => {
    expect(toAiFailureReason({ kind: 'timeout' })).toBe('timeout');
    expect(toAiFailureReason({ kind: 'network' })).toBe('unexpected');
  });
});
