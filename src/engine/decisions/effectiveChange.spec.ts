import { describe, expect, it } from 'vitest';
import type { Change } from '@/engine/changes/change';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { effectiveChange } from './effectiveChange';

const suggestion: Change = {
  kind: 'trimWhitespace',
  column: toColumnKey(0),
};
const edit: Change = { kind: 'setCells', cells: [] };

describe('effectiveChange', () => {
  it('is the edit when the decision is an edit, and the suggestion otherwise', () => {
    expect(
      effectiveChange({
        suggestion,
        decision: { status: 'edited', change: edit },
      })
    ).toBe(edit);
    expect(
      effectiveChange({ suggestion, decision: { status: 'accepted' } })
    ).toBe(suggestion);
    expect(effectiveChange({ suggestion, decision: undefined })).toBe(
      suggestion
    );
    expect(
      effectiveChange({ suggestion: null, decision: undefined })
    ).toBeNull();
  });
});
