import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanCell } from '@/engine/changes/cleanCell';
import type { Row } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { toIssueId } from '@/engine/issues/toIssueId';
import { makeIssue } from '../testing/makeIssue';
import { seedWorkspace } from '../testing/seedWorkspace';
import { analysisStore$ } from './analysisStore';
import { reviewActions } from './reviewStore';
import { useCleanPlan } from './useCleanPlan';
import { ROW_CHUNK_SIZE, workspaceStore$ } from './workspaceStore';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

const city = toColumnKey(1);
const trim = toIssueId('whitespace:1');
const casing = toIssueId('casing-variants:1');

describe('useCleanPlan', () => {
  beforeEach(() => {
    seedWorkspace(
      'name,city',
      'Ada,Paris',
      'Bo,paris',
      'Cy, PARIS ',
      'Di,Paris',
      'Ed,Rome',
      'Flo,Rome',
      'Gus,Rome',
      'Hal,Oslo',
      'Ivy,Oslo',
      'Jo,Oslo'
    );
  });

  it('leaves every cell as it was while nothing is accepted', () => {
    const { result } = renderHook(() => useCleanPlan());

    expect(cleanedPaddedCity(result.current)).toEqual({
      isChanged: false,
      value: ' PARIS ',
    });
  });

  it('shows the cleaned value of a cell once its issue is accepted, and the original again after undo', () => {
    const { result } = renderHook(() => useCleanPlan());

    act(() => reviewActions.accept(trim));
    expect(cleanedPaddedCity(result.current).value).toBe('PARIS');

    act(() => reviewActions.resetDecision(trim));
    expect(cleanedPaddedCity(result.current).value).toBe(' PARIS ');
  });

  it('shows no change for a rejected issue', () => {
    const { result } = renderHook(() => useCleanPlan());

    act(() => reviewActions.reject(trim));

    expect(cleanedPaddedCity(result.current).value).toBe(' PARIS ');
  });

  it('lets a value mapping win over a trim when both are accepted for one cell', () => {
    const { result } = renderHook(() => useCleanPlan());

    act(() => {
      reviewActions.accept(trim);
      reviewActions.accept(casing);
    });

    expect(cleanedPaddedCity(result.current)).toMatchObject({
      isChanged: true,
      value: 'Paris',
      origin: { issueId: casing },
    });
  });

  it('gives every reader the same plan until a decision changes it', () => {
    const first = renderHook(() => useCleanPlan());
    const second = renderHook(() => useCleanPlan());

    expect(second.result.current).toBe(first.result.current);

    act(() => reviewActions.accept(trim));

    expect(second.result.current).toBe(first.result.current);
    expect(first.result.current.columnRules[city]).not.toBeNull();
  });
});

function cleanedPaddedCity(plan: ReturnType<typeof useCleanPlan>) {
  return cleanCell({
    plan,
    rowId: toRowId(2),
    column: city,
    value: ' PARIS ',
  });
}

describe('useCleanPlan across chunks of rows', () => {
  it('fills a cell from a row of a later chunk once that chunk has arrived', () => {
    seedWorkspace('name,city', 'Ada,');
    const { phase } = workspaceStore$.getState();
    if (phase.status !== 'ready') throw new Error('Expected a ready workspace');
    const firstChunk: Row[] = Array.from(
      { length: ROW_CHUNK_SIZE },
      (_, index) => (index === 0 ? ['Ada', ''] : ['x', 'y'])
    );
    const merge = makeIssue({
      id: 'shared-identifiers:0',
      category: 'duplicate',
      rows: [0, ROW_CHUNK_SIZE],
      suggestion: {
        kind: 'mergeRows',
        keep: toRowId(0),
        remove: [toRowId(ROW_CHUNK_SIZE)],
        values: [{ column: city, from: toRowId(ROW_CHUNK_SIZE) }],
      },
      details: {
        kind: 'sharedIdentifiers',
        links: [],
        hasConflictingNames: false,
      },
    });
    workspaceStore$.setState({
      phase: { ...phase, rowChunks: [firstChunk] },
    });
    analysisStore$.setState({
      phase: {
        status: 'done',
        result: { profile: [], candidates: [], issues: [merge] },
      },
    });
    const { result } = renderHook(() => useCleanPlan());
    act(() => reviewActions.accept(merge.id));
    const keptCity = () =>
      cleanCell({
        plan: result.current,
        rowId: toRowId(0),
        column: city,
        value: '',
      });
    expect(keptCity()).toEqual({ isChanged: false, value: '' });

    act(() =>
      workspaceStore$.setState({
        phase: { ...phase, rowChunks: [firstChunk, [['Zed', 'Oslo']]] },
      })
    );

    expect(keptCity()).toMatchObject({ isChanged: true, value: 'Oslo' });
    expect(result.current.removedRows.has(toRowId(ROW_CHUNK_SIZE))).toBe(true);
  });
});
