import { describe, expect, it } from 'vitest';
import { AI_FAILURE_REASONS } from '@/ai/aiFailureReason';
import { aiFailureCopy } from './aiFailureCopy';

describe('aiFailureCopy', () => {
  it('has words for every failure reason', () => {
    for (const reason of AI_FAILURE_REASONS) {
      expect(aiFailureCopy[reason]).not.toBe('');
    }
  });

  it.each(['rateLimited', 'budgetExhausted', 'aiNotConfigured'] as const)(
    'says the checks still work when the reason is %s',
    (reason) => {
      expect(aiFailureCopy[reason]).toContain('The checks still work');
    }
  );
});
