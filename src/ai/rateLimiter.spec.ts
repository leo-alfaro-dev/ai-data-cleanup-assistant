import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rateLimiter';

function makeLimiter() {
  let time = 0;
  const limiter = createRateLimiter({
    limit: 2,
    windowMs: 1000,
    now: () => time,
  });

  return {
    limiter,
    advance(milliseconds: number) {
      time += milliseconds;
    },
  };
}

describe('createRateLimiter', () => {
  it('allows calls up to the limit and refuses the next one', () => {
    const { limiter } = makeLimiter();

    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(false);
  });

  it('counts each address on its own', () => {
    const { limiter } = makeLimiter();
    limiter.take('a');
    limiter.take('a');

    expect(limiter.take('b')).toBe(true);
  });

  it('allows calls again once the window has passed', () => {
    const { limiter, advance } = makeLimiter();
    limiter.take('a');
    limiter.take('a');
    advance(999);
    expect(limiter.take('a')).toBe(false);

    advance(1);

    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(false);
  });
});
