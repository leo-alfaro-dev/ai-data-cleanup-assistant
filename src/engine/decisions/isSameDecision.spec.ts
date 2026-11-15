import { describe, expect, it } from 'vitest';
import type { Change } from '@/engine/changes/change';
import type { Decision } from './decision';
import { isSameDecision } from './isSameDecision';

const edit: Change = { kind: 'setCells', cells: [] };
const accepted: Decision = { status: 'accepted' };
const rejected: Decision = { status: 'rejected' };

describe('isSameDecision', () => {
  it('compares statuses', () => {
    expect(isSameDecision({ first: null, second: null })).toBe(true);
    expect(isSameDecision({ first: null, second: accepted })).toBe(false);
    expect(
      isSameDecision({ first: accepted, second: { status: 'accepted' } })
    ).toBe(true);
    expect(isSameDecision({ first: accepted, second: rejected })).toBe(false);
  });

  it('compares an edit by its change', () => {
    const first: Decision = { status: 'edited', change: edit };

    expect(
      isSameDecision({ first, second: { status: 'edited', change: edit } })
    ).toBe(true);
    expect(
      isSameDecision({
        first,
        second: { status: 'edited', change: { kind: 'setCells', cells: [] } },
      })
    ).toBe(false);
    expect(isSameDecision({ first, second: accepted })).toBe(false);
  });
});
