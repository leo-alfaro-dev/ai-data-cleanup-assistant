import { describe, expect, it, vi } from 'vitest';
import { memoizeByReference } from './memoizeByReference';

describe('memoizeByReference', () => {
  it('computes once for the same object and returns the same result', () => {
    const compute = vi.fn((key: { name: string }) => [key.name]);
    const memoized = memoizeByReference(compute);
    const key = { name: 'ada' };

    const first = memoized(key);
    const second = memoized(key);

    expect(second).toBe(first);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('computes again for another object with equal contents', () => {
    const compute = vi.fn((key: { name: string }) => [key.name]);
    const memoized = memoizeByReference(compute);

    const first = memoized({ name: 'ada' });
    const second = memoized({ name: 'ada' });

    expect(second).not.toBe(first);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('remembers an empty result', () => {
    const compute = vi.fn((): string[] => []);
    const memoized = memoizeByReference(compute);
    const key = {};

    memoized(key);
    memoized(key);

    expect(compute).toHaveBeenCalledTimes(1);
  });
});
