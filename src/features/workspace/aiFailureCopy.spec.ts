import { describe, expect, it } from 'vitest';
import { AI_FAILURE_REASONS } from '@/ai/aiFailureReason';
import { HOSTED_REQUESTS_PER_WINDOW } from '@/ai/hostedRequestLimit';
import { aiFailureCopy } from './aiFailureCopy';

describe('aiFailureCopy', () => {
  it('has words for every failure reason', () => {
    for (const reason of AI_FAILURE_REASONS) {
      expect(aiFailureCopy[reason]).not.toBe('');
    }
  });

  it.each([
    'rateLimited',
    'providerRateLimited',
    'budgetExhausted',
    'aiNotConfigured',
  ] as const)('says the checks still work when the reason is %s', (reason) => {
    expect(aiFailureCopy[reason]).toContain('The checks still work');
  });

  it('names the demo limit with the numbers the limiter uses', () => {
    expect(aiFailureCopy.rateLimited).toContain(
      `${HOSTED_REQUESTS_PER_WINDOW} AI requests every 10 minutes`
    );
  });
});
