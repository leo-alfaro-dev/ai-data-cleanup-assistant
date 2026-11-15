import { CancelablePromise, defer } from 'easy-cancelable-promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisResult } from '@/engine/analysis/analysisResult';
import { toIssueId } from '@/engine/issues/toIssueId';
import { aiActions } from './aiStore';
import { analysisActions, analysisStore$ } from './analysisStore';

const { worker } = vi.hoisted(() => ({
  worker: {
    analyze: vi.fn<() => CancelablePromise<AnalysisResult | null>>(),
    buildAiRequests: vi.fn(),
  },
}));

vi.mock('@/workers/getDatasetWorker', () => ({
  getDatasetWorker: () => worker,
}));

describe('analysisStore', () => {
  beforeEach(() => {
    analysisActions.reset();
    aiActions.reset();
    worker.analyze.mockReset();
    worker.buildAiRequests.mockReset();
    worker.buildAiRequests.mockReturnValue(CancelablePromise.resolve(null));
  });

  it('lands the issues, the profile and the candidates', async () => {
    const result = analysis('whitespace:1');
    worker.analyze.mockReturnValue(CancelablePromise.resolve(result));

    await analysisActions.run();

    expect(analysisStore$.getState().phase).toEqual({ status: 'done', result });
  });

  it('starts the AI run once the checks are done, and not before', async () => {
    const call = defer<AnalysisResult | null>();
    worker.analyze.mockReturnValue(call.promise);

    const running = analysisActions.run();
    expect(worker.buildAiRequests).not.toHaveBeenCalled();

    call.resolve(analysis());
    await running;

    expect(worker.buildAiRequests).toHaveBeenCalledOnce();
  });

  it('does not start the AI run when the checks fail', async () => {
    worker.analyze.mockReturnValue(CancelablePromise.reject(new Error('x')));

    await analysisActions.run();

    expect(worker.buildAiRequests).not.toHaveBeenCalled();
  });

  it('shows the stage and percentage the worker reports', async () => {
    const call = defer<AnalysisResult | null>();
    worker.analyze.mockReturnValue(call.promise);

    const running = analysisActions.run();
    expect(analysisStore$.getState().phase).toEqual({
      status: 'running',
      stage: 'profiling',
      percentage: 0,
    });

    call.reportProgress(46.2, 'checking');
    expect(analysisStore$.getState().phase).toEqual({
      status: 'running',
      stage: 'checking',
      percentage: 46.2,
    });

    call.resolve(analysis());
    await running;
  });

  it('ignores progress it does not recognize', async () => {
    const call = defer<AnalysisResult | null>();
    worker.analyze.mockReturnValue(call.promise);

    const running = analysisActions.run();
    call.reportProgress(80, 'something else');

    expect(analysisStore$.getState().phase).toMatchObject({ percentage: 0 });

    call.resolve(analysis());
    await running;
  });

  it('fails when the worker call fails or finds no file', async () => {
    worker.analyze.mockReturnValue(
      CancelablePromise.reject(new Error('crashed'))
    );
    await analysisActions.run();
    expect(analysisStore$.getState().phase).toEqual({ status: 'failed' });

    worker.analyze.mockReturnValue(CancelablePromise.resolve(null));
    await analysisActions.run();
    expect(analysisStore$.getState().phase).toEqual({ status: 'failed' });
  });

  it('runs again after a failure', async () => {
    worker.analyze.mockReturnValueOnce(
      CancelablePromise.reject(new Error('x'))
    );
    await analysisActions.run();
    worker.analyze.mockReturnValueOnce(CancelablePromise.resolve(analysis()));

    await analysisActions.run();

    expect(analysisStore$.getState().phase.status).toBe('done');
  });

  it('cancels the analysis in flight on reset and drops its answer', async () => {
    const call = defer<AnalysisResult | null>();
    worker.analyze.mockReturnValue(call.promise);

    const running = analysisActions.run();
    analysisActions.reset();
    await running;

    expect(call.promise.status).toBe('canceled');
    expect(analysisStore$.getState().phase).toEqual({ status: 'idle' });
  });

  it('discards the answer of a run that a newer run replaced', async () => {
    const first = defer<AnalysisResult | null>();
    const second = defer<AnalysisResult | null>();
    worker.analyze
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const firstRun = analysisActions.run();
    const secondRun = analysisActions.run();
    await firstRun;

    expect(first.promise.status).toBe('canceled');
    expect(analysisStore$.getState().phase.status).toBe('running');

    const result = analysis('placeholders:3');
    second.resolve(result);
    await secondRun;

    expect(analysisStore$.getState().phase).toEqual({ status: 'done', result });
  });
});

function analysis(...issueIds: string[]): AnalysisResult {
  return {
    profile: [],
    candidates: [],
    issues: issueIds.map((id) => ({
      id: toIssueId(id),
      category: 'inconsistent',
      source: 'check',
      confidence: 'certain',
      rows: [],
      column: null,
      suggestion: null,
      details: { kind: 'blankRows' },
    })),
  };
}
