import { describe, expect, it } from 'vitest';
import { latestQuota } from './latestQuota';

const window = { limit: 50, resetsAt: 1_000 };

describe('latestQuota', () => {
  it('takes the first count it hears', () => {
    expect(
      latestQuota({ current: null, incoming: { ...window, used: 3 } })
    ).toEqual({ ...window, used: 3 });
  });

  it('keeps the higher count of one window, whatever order the answers arrive in', () => {
    const higher = { ...window, used: 6 };
    const lower = { ...window, used: 5 };

    expect(latestQuota({ current: higher, incoming: lower })).toBe(higher);
    expect(latestQuota({ current: lower, incoming: higher })).toBe(higher);
  });

  it('moves to a newer window even when its count is lower, and ignores an older one', () => {
    const old = { ...window, used: 50 };
    const fresh = { limit: 50, resetsAt: 2_000, used: 1 };

    expect(latestQuota({ current: old, incoming: fresh })).toBe(fresh);
    expect(latestQuota({ current: fresh, incoming: old })).toBe(fresh);
  });
});
