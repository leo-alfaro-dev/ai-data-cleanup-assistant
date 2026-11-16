import { afterEach, describe, expect, it, vi } from 'vitest';
import { HOSTED_REQUESTS_PER_WINDOW } from './hostedRequestLimit';
import { createRateLimiter } from './rateLimiter';

function makeLimiter({ isEnforced = true }: { isEnforced?: boolean } = {}) {
  let time = 0;
  const limiter = createRateLimiter({
    limit: 2,
    windowMs: 1000,
    isEnforced,
    now: () => time,
  });

  return {
    isAllowed: (address: string) => limiter.take(address).isAllowed,
    limiter,
    advance(milliseconds: number) {
      time += milliseconds;
    },
  };
}

describe('createRateLimiter', () => {
  it('allows requests up to the limit and refuses the next one', () => {
    const { isAllowed } = makeLimiter();

    expect(isAllowed('a')).toBe(true);
    expect(isAllowed('a')).toBe(true);
    expect(isAllowed('a')).toBe(false);
  });

  it('counts each address on its own', () => {
    const { isAllowed } = makeLimiter();
    isAllowed('a');
    isAllowed('a');

    expect(isAllowed('b')).toBe(true);
  });

  it('allows requests again once the window has passed', () => {
    const { isAllowed, advance } = makeLimiter();
    isAllowed('a');
    isAllowed('a');
    advance(999);
    expect(isAllowed('a')).toBe(false);

    advance(1);

    expect(isAllowed('a')).toBe(true);
    expect(isAllowed('a')).toBe(true);
    expect(isAllowed('a')).toBe(false);
  });

  it('reports how many requests the window holds, its limit, and when it resets', () => {
    const { limiter, advance } = makeLimiter();
    limiter.take('a');
    advance(300);

    expect(limiter.take('a')).toEqual({
      isAllowed: true,
      used: 2,
      limit: 2,
      resetsAt: 1000,
    });
    expect(limiter.take('a')).toMatchObject({ isAllowed: false, used: 2 });
  });

  it('counts past the limit without refusing when it is not enforced', () => {
    const { limiter } = makeLimiter({ isEnforced: false });
    limiter.take('a');
    limiter.take('a');

    expect(limiter.take('a')).toMatchObject({ isAllowed: true, used: 3 });
  });
});

describe('hostedRateLimiter', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function answersPastTheLimit(environment: string) {
    vi.stubEnv('NODE_ENV', environment);
    vi.resetModules();
    const { hostedRateLimiter } = await import('./rateLimiter');

    return Array.from(
      { length: HOSTED_REQUESTS_PER_WINDOW + 1 },
      () => hostedRateLimiter.take('visitor').isAllowed
    );
  }

  it('refuses the request past the limit in production', async () => {
    const answers = await answersPastTheLimit('production');

    expect(answers.slice(0, -1).every(Boolean)).toBe(true);
    expect(answers.at(-1)).toBe(false);
  });

  it('lets every request through under next dev, where the hosted key belongs to the developer', async () => {
    const answers = await answersPastTheLimit('development');

    expect(answers.every(Boolean)).toBe(true);
  });
});
