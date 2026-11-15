import { describe, expect, it } from 'vitest';
import { createRandom } from '../generate/createRandom';
import { EMAIL_DOMAINS } from '../generate/emailDomains';
import { introduceDomainTypo } from './introduceDomainTypo';
import { isOneEditApart } from './isOneEditApart';

describe('introduceDomainTypo', () => {
  it('keeps the local part and the dot, and moves the domain one edit from a real one', () => {
    const random = createRandom(41);

    for (const domain of EMAIL_DOMAINS) {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const typo = introduceDomainTypo({
          email: `ava.chen@${domain}`,
          random,
        });
        const [local, typoDomain = ''] = typo.split('@');

        expect(local).toBe('ava.chen');
        expect(typoDomain.split('.')).toHaveLength(2);
        expect(isOneEditApart({ first: domain, second: typoDomain })).toBe(
          true
        );
        expect(EMAIL_DOMAINS).not.toContain(typoDomain);
      }
    }
  });
});
