import { CancelablePromise, defer } from 'easy-cancelable-promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import type { Change } from '@/engine/changes/change';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import type { CleanedFiles } from '@/engine/export/cleanedFiles';
import { toIssueId } from '@/engine/issues/toIssueId';
import { seedWorkspace } from '../testing/seedWorkspace';
import { analysisStore$ } from './analysisStore';
import { exportActions, exportStore$ } from './exportStore';
import { reviewActions } from './reviewStore';

const { worker } = vi.hoisted(() => ({
  worker: {
    exportFiles:
      vi.fn<
        (request: {
          accepted: AcceptedChange[];
          createdAt: string;
        }) => CancelablePromise<CleanedFiles | null>
      >(),
    preview: vi.fn(),
  },
}));

vi.mock('@/workers/getDatasetWorker', () => ({
  getDatasetWorker: () => worker,
}));

const files: CleanedFiles = {
  csv: 'name\nAda\n',
  changeLog: 'row\n',
  recipe: '{}\n',
  cellsChanged: 3,
  rowsRemoved: 1,
};

describe('exportStore', () => {
  beforeEach(() => {
    worker.exportFiles.mockReset();
    worker.preview.mockReset();
    worker.preview.mockReturnValue(CancelablePromise.resolve(null));
    seedWorkspace('name,city', ' Ada ,Paris', 'Bo ,Rome', 'Cy,Oslo', 'Cy,Oslo');
  });

  it('sends the accepted changes and reports the files and how many issues are pending', async () => {
    worker.exportFiles.mockReturnValue(CancelablePromise.resolve(files));
    reviewActions.accept(toIssueId('whitespace:0'));

    await exportActions.open();

    const [request] = worker.exportFiles.mock.calls[0] ?? [];
    const trim: Change = { kind: 'trimWhitespace', column: toColumnKey(0) };
    expect(request?.accepted).toEqual([
      { issueId: 'whitespace:0', change: trim },
    ]);
    expect(Date.parse(request?.createdAt ?? '')).not.toBeNaN();
    expect(exportStore$.getState().phase).toEqual({
      status: 'ready',
      files,
      pendingCount: 1,
    });
  });

  it('sends no changes when nothing is accepted', async () => {
    worker.exportFiles.mockReturnValue(CancelablePromise.resolve(files));

    await exportActions.open();

    expect(worker.exportFiles).toHaveBeenCalledWith({
      accepted: [],
      createdAt: expect.any(String),
    });
    expect(exportStore$.getState().phase).toMatchObject({
      status: 'ready',
      pendingCount: 2,
    });
  });

  it('counts a rejected issue as decided', async () => {
    worker.exportFiles.mockReturnValue(CancelablePromise.resolve(files));
    reviewActions.reject(toIssueId('whitespace:0'));

    await exportActions.open();

    expect(exportStore$.getState().phase).toMatchObject({ pendingCount: 1 });
  });

  it('reports no pending count when the checks did not finish', async () => {
    worker.exportFiles.mockReturnValue(CancelablePromise.resolve(files));
    analysisStore$.setState({ phase: { status: 'failed' } });

    await exportActions.open();

    expect(exportStore$.getState().phase).toEqual({
      status: 'ready',
      files,
      pendingCount: null,
    });
  });

  it('is running while the worker builds the files, and cannot be closed then', async () => {
    const call = defer<CleanedFiles | null>();
    worker.exportFiles.mockReturnValue(call.promise);

    const opening = exportActions.open();
    exportActions.close();

    expect(exportStore$.getState().phase).toEqual({ status: 'running' });

    call.resolve(files);
    await opening;
    exportActions.close();

    expect(exportStore$.getState().phase).toEqual({ status: 'closed' });
  });

  it('fails when the worker call fails or finds no file, and can be closed', async () => {
    worker.exportFiles.mockReturnValueOnce(
      CancelablePromise.reject(new Error('x'))
    );
    await exportActions.open();
    expect(exportStore$.getState().phase).toEqual({ status: 'failed' });

    exportActions.close();
    worker.exportFiles.mockReturnValueOnce(CancelablePromise.resolve(null));
    await exportActions.open();
    expect(exportStore$.getState().phase).toEqual({ status: 'failed' });
  });

  it('cancels the export in flight and closes on reset', async () => {
    const call = defer<CleanedFiles | null>();
    worker.exportFiles.mockReturnValue(call.promise);

    const opening = exportActions.open();
    exportActions.reset();
    await opening;

    expect(call.promise.status).toBe('canceled');
    expect(exportStore$.getState().phase).toEqual({ status: 'closed' });
  });
});
