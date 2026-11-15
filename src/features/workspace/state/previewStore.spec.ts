import { CancelablePromise, defer } from 'easy-cancelable-promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Change } from '@/engine/changes/change';
import type { ChangePreview } from '@/engine/changes/changePreview';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toIssueId } from '@/engine/issues/toIssueId';
import { previewActions, previewStore$ } from './previewStore';

const { worker } = vi.hoisted(() => ({
  worker: {
    preview:
      vi.fn<(change: Change) => CancelablePromise<ChangePreview | null>>(),
  },
}));

vi.mock('@/workers/getDatasetWorker', () => ({
  getDatasetWorker: () => worker,
}));

const change: Change = { kind: 'trimWhitespace', column: toColumnKey(1) };
const preview: ChangePreview = {
  counts: { cells: 2, rows: 2, removedRows: 0 },
  examples: [{ before: ' Ada ', after: 'Ada', cells: 2 }],
};

describe('previewStore', () => {
  beforeEach(() => {
    previewActions.reset();
    worker.preview.mockReset();
  });

  it('holds a loading entry while the worker builds the preview, then the preview', async () => {
    const call = defer<ChangePreview | null>();
    worker.preview.mockReturnValue(call.promise);
    const issueId = toIssueId('whitespace:1');

    const loading = previewActions.load({ issueId, change });
    expect(previewStore$.getState().previews.get(issueId)).toEqual({
      status: 'loading',
    });

    call.resolve(preview);
    await loading;

    expect(previewStore$.getState().previews.get(issueId)).toEqual({
      status: 'ready',
      preview,
    });
    expect(worker.preview).toHaveBeenCalledWith(change);
  });

  it('asks the worker once for an issue it already has', async () => {
    worker.preview.mockReturnValue(CancelablePromise.resolve(preview));
    const issueId = toIssueId('whitespace:1');

    await previewActions.load({ issueId, change });
    await previewActions.load({ issueId, change });

    expect(worker.preview).toHaveBeenCalledOnce();
  });

  it('asks the worker again for a preview that failed', async () => {
    const issueId = toIssueId('a');
    worker.preview.mockReturnValueOnce(
      CancelablePromise.reject(new Error('x'))
    );
    worker.preview.mockReturnValueOnce(CancelablePromise.resolve(preview));

    await previewActions.load({ issueId, change });
    expect(previewStore$.getState().previews.get(issueId)).toEqual({
      status: 'failed',
    });
    await previewActions.load({ issueId, change });

    expect(worker.preview).toHaveBeenCalledTimes(2);
    expect(previewStore$.getState().previews.get(issueId)).toEqual({
      status: 'ready',
      preview,
    });
  });

  it('marks the entry failed when the worker call fails or finds no file', async () => {
    const first = toIssueId('a');
    const second = toIssueId('b');
    worker.preview.mockReturnValueOnce(
      CancelablePromise.reject(new Error('x'))
    );
    worker.preview.mockReturnValueOnce(CancelablePromise.resolve(null));

    await previewActions.load({ issueId: first, change });
    await previewActions.load({ issueId: second, change });

    const { previews } = previewStore$.getState();
    expect(previews.get(first)).toEqual({ status: 'failed' });
    expect(previews.get(second)).toEqual({ status: 'failed' });
  });

  it('cancels the preview still being built when another issue asks, and forgets it', async () => {
    const slow = defer<ChangePreview | null>();
    worker.preview
      .mockReturnValueOnce(slow.promise)
      .mockReturnValueOnce(CancelablePromise.resolve(preview));
    const first = toIssueId('a');
    const second = toIssueId('b');

    const firstLoading = previewActions.load({ issueId: first, change });
    await previewActions.load({ issueId: second, change });
    await firstLoading;

    expect(slow.promise.status).toBe('canceled');
    const { previews } = previewStore$.getState();
    expect(previews.has(first)).toBe(false);
    expect(previews.get(second)).toMatchObject({ status: 'ready' });
  });

  it('forgets everything and cancels the call in flight on reset', async () => {
    const call = defer<ChangePreview | null>();
    worker.preview.mockReturnValue(call.promise);

    const loading = previewActions.load({ issueId: toIssueId('a'), change });
    previewActions.reset();
    await loading;

    expect(call.promise.status).toBe('canceled');
    expect(previewStore$.getState().previews.size).toBe(0);
  });
});
