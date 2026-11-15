import { describe, expect, it, vi } from 'vitest';
import { profileDataset } from '@/engine/profile/profileDataset';
import { toDataset } from '@/engine/testing/toDataset';
import type { Check } from './check';
import { runChecks } from './runChecks';
import { toCheckId } from './toCheckId';

const dataset = toDataset('name,age', 'Ada,36', 'Bo,41');
const profile = profileDataset(dataset);

describe('runChecks', () => {
  it('runs each check once, with the dataset and profile it was given', () => {
    const first = fakeCheck({ id: 'first' });
    const second = fakeCheck({ id: 'second' });

    const issues = runChecks({
      dataset,
      profile,
      checks: [first.check, second.check],
    });

    expect(issues).toEqual([]);
    for (const { find } of [first, second]) {
      expect(find).toHaveBeenCalledTimes(1);
      const [input] = find.mock.calls[0] ?? [];
      expect(input?.dataset).toBe(dataset);
      expect(input?.profile).toBe(profile);
    }
  });

  it('runs the checks in registry order', () => {
    const calls: string[] = [];
    const checks = ['first', 'second', 'third'].map(
      (id) => fakeCheck({ id, calls }).check
    );

    runChecks({ dataset, profile, checks });

    expect(calls).toEqual(['first', 'second', 'third']);
  });

  it('finds nothing with an empty registry', () => {
    expect(runChecks({ dataset, profile, checks: [] })).toEqual([]);
  });
});

function fakeCheck({ id, calls = [] }: { id: string; calls?: string[] }) {
  const find = vi.fn<Check['find']>(() => {
    calls.push(id);
    return [];
  });
  const check: Check = { id: toCheckId(id), category: 'duplicate', find };

  return { check, find };
}
