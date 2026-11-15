import { describe, expect, it } from 'vitest';
import { ownKeyOffer } from './ownKeyOffer';

describe('ownKeyOffer', () => {
  it.each(['budgetExhausted', 'rateLimited'] as const)(
    'offers the visitor key when the reason is %s',
    (reason) => {
      expect(ownKeyOffer(reason)).toContain('own OpenRouter key');
    }
  );

  it.each(['invalidKey', 'timeout', 'unexpected', 'aiNotConfigured'] as const)(
    'offers nothing when the reason is %s',
    (reason) => {
      expect(ownKeyOffer(reason)).toBeNull();
    }
  );
});
