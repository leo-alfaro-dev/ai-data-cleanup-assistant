import { CancelablePromise, defer } from 'easy-cancelable-promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Row } from '@/engine/dataset/dataset';
import type { FileFacts } from '@/engine/dataset/fileFacts';
import type { LoadFailureReason } from '@/engine/dataset/loadFailure';
import {
  ROW_CHUNK_SIZE,
  workspaceActions,
  workspaceStore$,
} from './workspaceStore';

type LoadResult =
  { ok: true; facts: FileFacts } | { ok: false; reason: LoadFailureReason };

const { worker } = vi.hoisted(() => ({
  worker: {
    load: vi.fn<(file: File) => CancelablePromise<LoadResult>>(),
    rows: vi.fn<
      (range: { offset: number; limit: number }) => CancelablePromise<Row[]>
    >(),
  },
}));

vi.mock('@/workers/getDatasetWorker', () => ({
  getDatasetWorker: () => worker,
}));

describe('workspaceStore', () => {
  beforeEach(() => {
    workspaceActions.reset();
    worker.load.mockReset();
    worker.rows.mockReset();
    worker.rows.mockReturnValue(CancelablePromise.resolve([]));
  });

  it('loads a file and pulls its rows in chunks, first chunk first', async () => {
    worker.load.mockReturnValue(
      CancelablePromise.resolve(
        loaded({ fileName: 'people.csv', rowCount: 25_000 })
      )
    );
    worker.rows.mockImplementation(({ offset, limit }) =>
      CancelablePromise.resolve(
        Array.from({ length: Math.min(limit, 25_000 - offset) }, () => ['Ada'])
      )
    );

    await workspaceActions.loadFile(csvFile('people.csv'));

    const phase = workspaceStore$.getState().phase;
    expect(phase).toMatchObject({
      status: 'ready',
      facts: { fileName: 'people.csv', rowCount: 25_000 },
    });
    expect(worker.rows.mock.calls).toEqual([
      [{ offset: 0, limit: ROW_CHUNK_SIZE }],
      [{ offset: 10_000, limit: ROW_CHUNK_SIZE }],
      [{ offset: 20_000, limit: ROW_CHUNK_SIZE }],
    ]);
    expect(
      phase.status === 'ready' && phase.rowChunks.map((chunk) => chunk.length)
    ).toEqual([10_000, 10_000, 5_000]);
  });

  it('shows the stage and percentage the worker reports', async () => {
    const load = defer<LoadResult>();
    worker.load.mockReturnValue(load.promise);

    const loading = workspaceActions.loadFile(csvFile('people.csv'));
    expect(workspaceStore$.getState().phase).toEqual({
      status: 'loading',
      fileName: 'people.csv',
      stage: 'reading',
      percentage: 0,
    });

    load.reportProgress(66.7, 'parsing');
    expect(workspaceStore$.getState().phase).toMatchObject({
      stage: 'parsing',
      percentage: 66.7,
    });

    load.resolve(loaded({ fileName: 'people.csv', rowCount: 2 }));
    await loading;
  });

  it.each<LoadFailureReason>([
    'empty',
    'noDataRows',
    'tooLarge',
    'notCsv',
    'unreadable',
  ])('fails with %s when the worker reports it', async (reason) => {
    worker.load.mockReturnValue(
      CancelablePromise.resolve({ ok: false, reason })
    );

    await workspaceActions.loadFile(csvFile('people.csv'));

    expect(workspaceStore$.getState().phase).toEqual({
      status: 'failed',
      fileName: 'people.csv',
      reason,
    });
    expect(worker.rows).not.toHaveBeenCalled();
  });

  it('fails as unreadable when the worker call itself fails', async () => {
    worker.load.mockReturnValue(CancelablePromise.reject(new Error('crashed')));

    await workspaceActions.loadFile(csvFile('people.csv'));

    expect(workspaceStore$.getState().phase).toMatchObject({
      status: 'failed',
      reason: 'unreadable',
    });
  });

  it('cancels the load in flight when a second file is loaded', async () => {
    const first = defer<LoadResult>();
    worker.load
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(
        CancelablePromise.resolve(
          loaded({ fileName: 'second.csv', rowCount: 3 })
        )
      );

    const firstLoading = workspaceActions.loadFile(csvFile('first.csv'));
    await workspaceActions.loadFile(csvFile('second.csv'));
    await firstLoading;

    expect(first.promise.status).toBe('canceled');
    expect(workspaceStore$.getState().phase).toMatchObject({
      status: 'ready',
      facts: { fileName: 'second.csv' },
    });
  });

  it('discards an answer from the first load that arrives after the second started', async () => {
    const first = defer<LoadResult>();
    const second = defer<LoadResult>();
    worker.load
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const firstLoading = workspaceActions.loadFile(csvFile('first.csv'));
    first.resolve(loaded({ fileName: 'first.csv', rowCount: 3 }));
    const secondLoading = workspaceActions.loadFile(csvFile('second.csv'));
    await firstLoading;

    expect(workspaceStore$.getState().phase).toMatchObject({
      status: 'loading',
      fileName: 'second.csv',
    });
    expect(worker.rows).not.toHaveBeenCalled();

    second.resolve(loaded({ fileName: 'second.csv', rowCount: 3 }));
    await secondLoading;

    expect(workspaceStore$.getState().phase).toMatchObject({
      status: 'ready',
      facts: { fileName: 'second.csv' },
    });
  });

  it('discards rows from a file that was replaced while they were pulled', async () => {
    const firstRows = defer<Row[]>();
    worker.load
      .mockReturnValueOnce(
        CancelablePromise.resolve(
          loaded({ fileName: 'first.csv', rowCount: 3 })
        )
      )
      .mockReturnValueOnce(
        CancelablePromise.resolve(
          loaded({ fileName: 'second.csv', rowCount: 1 })
        )
      );
    worker.rows
      .mockReturnValueOnce(firstRows.promise)
      .mockReturnValueOnce(CancelablePromise.resolve([['second']]));

    const firstLoading = workspaceActions.loadFile(csvFile('first.csv'));
    await vi.waitFor(() => expect(worker.rows).toHaveBeenCalledOnce());
    await workspaceActions.loadFile(csvFile('second.csv'));
    firstRows.resolve([['first'], ['first'], ['first']]);
    await firstLoading;

    expect(firstRows.promise.status).toBe('canceled');
    expect(workspaceStore$.getState().phase).toMatchObject({
      status: 'ready',
      facts: { fileName: 'second.csv' },
      rowChunks: [[['second']]],
    });
  });

  it('returns to empty and cancels the load in flight on reset', () => {
    const load = defer<LoadResult>();
    worker.load.mockReturnValue(load.promise);

    void workspaceActions.loadFile(csvFile('people.csv'));
    workspaceActions.reset();

    expect(load.promise.status).toBe('canceled');
    expect(workspaceStore$.getState().phase).toEqual({ status: 'empty' });
  });
});

function csvFile(name: string): File {
  return new File(['name\nAda'], name, { type: 'text/csv' });
}

function loaded({
  fileName,
  rowCount,
}: {
  fileName: string;
  rowCount: number;
}): LoadResult {
  return {
    ok: true,
    facts: {
      fileName,
      rowCount,
      columnCount: 1,
      format: {
        delimiter: ',',
        lineBreak: '\n',
        hasByteOrderMark: false,
        encoding: 'utf-8',
      },
    },
  };
}
