import { describe, expect, it, vi } from 'vitest';
import { memoizeLast } from './memoizeLast';

describe('memoizeLast', () => {
  it('computes once while every input is the same object', () => {
    const compute = vi.fn(({ list }: { list: number[]; label: string }) => [
      list.length,
    ]);
    const memoized = memoizeLast(compute);
    const list = [1, 2];

    const first = memoized({ list, label: 'a' });
    const second = memoized({ list, label: 'a' });

    expect(second).toBe(first);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('computes again when any one input changes', () => {
    const compute = vi.fn(({ list }: { list: number[]; label: string }) => [
      list.length,
    ]);
    const memoized = memoizeLast(compute);
    const list = [1, 2];

    memoized({ list, label: 'a' });
    memoized({ list, label: 'b' });
    memoized({ list: [1, 2], label: 'b' });

    expect(compute).toHaveBeenCalledTimes(3);
  });

  it('remembers only the last call', () => {
    const compute = vi.fn(({ value }: { value: object }) => [value]);
    const memoized = memoizeLast(compute);
    const first = {};
    const second = {};

    memoized({ value: first });
    memoized({ value: second });
    memoized({ value: first });

    expect(compute).toHaveBeenCalledTimes(3);
  });
});
