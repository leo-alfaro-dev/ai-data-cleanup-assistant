import type { CancelablePromise } from 'easy-cancelable-promise';
import { createGlobalState } from 'react-global-state-hooks';
import type { FileFacts } from '@/engine/dataset/fileFacts';
import type { LoadFailureReason } from '@/engine/dataset/loadFailure';
import { tryCatch } from '@/lib/tryCatch';
import { getDatasetWorker } from '@/workers/getDatasetWorker';
import { LOAD_STAGES } from '@/workers/loadStage';
import { SAMPLE_FILE_NAME, SAMPLE_URL } from '../sampleFile';
import { analysisActions } from './analysisStore';
import { NO_FILE_FACTS } from './noFileFacts';
import { resetReview } from './resetReview';
import type { WorkspacePhase } from './workspacePhase';

export const ROW_CHUNK_SIZE = 10_000;

export const workspaceStore$ = createGlobalState(makeInitialState(), {
  metadata: makeInitialMetadata(),
  actions: {
    loadFile(file: File) {
      return async (store) => {
        store.metadata.workerCall?.cancel(SUPERSEDED);
        resetReview();

        const load = Symbol(file.name);
        const isCurrent = () => store.metadata.load === load;
        const track = <Result>(call: CancelablePromise<Result>) => {
          store.setMetadata({ load, workerCall: call });
          return call;
        };
        const fail = (reason: LoadFailureReason) => {
          resetReview();
          store.setState({
            phase: { status: 'failed', fileName: file.name, reason },
          });
        };

        store.setMetadata({ load, workerCall: null });
        store.setState({
          phase: {
            status: 'loading',
            fileName: file.name,
            stage: 'reading',
            percentage: 0,
          },
        });

        const loadCall = getDatasetWorker()
          .load(file)
          .onProgress((percentage, payload) => {
            const stage = LOAD_STAGES.find((option) => option === payload);
            if (!stage || !isCurrent()) return;

            store.setState({
              phase: {
                status: 'loading',
                fileName: file.name,
                stage,
                percentage,
              },
            });
          });

        const { result, error } = await tryCatch(() => track(loadCall));
        if (!isCurrent()) return;
        if (error) return fail('unreadable');
        if (!result.ok) return fail(result.reason);

        const { facts } = result;
        store.setState({ phase: { status: 'ready', facts, rowChunks: [] } });

        for (
          let offset = 0;
          offset < facts.rowCount;
          offset += ROW_CHUNK_SIZE
        ) {
          const { result: chunk, error: chunkError } = await tryCatch(() =>
            track(getDatasetWorker().rows({ offset, limit: ROW_CHUNK_SIZE }))
          );
          if (!isCurrent()) return;
          if (chunkError) return fail('unreadable');

          store.setState(({ phase }) => {
            if (phase.status !== 'ready') return { phase };

            return {
              phase: { ...phase, rowChunks: [...phase.rowChunks, chunk] },
            };
          });
          if (offset === 0) void analysisActions.run();
        }
      };
    },

    loadSample() {
      return async (store) => {
        store.metadata.workerCall?.cancel(SUPERSEDED);
        const load = Symbol(SAMPLE_FILE_NAME);
        store.setMetadata({ load, workerCall: null });
        store.setState({
          phase: {
            status: 'loading',
            fileName: SAMPLE_FILE_NAME,
            stage: 'reading',
            percentage: 0,
          },
        });

        const { result: file, error } = await tryCatch(async () => {
          const response = await fetch(SAMPLE_URL);
          if (!response.ok) throw new Error('sample not served');

          return new File([await response.blob()], SAMPLE_FILE_NAME, {
            type: 'text/csv',
          });
        });
        if (store.metadata.load !== load) return;
        if (error) {
          return store.setState({
            phase: {
              status: 'failed',
              fileName: SAMPLE_FILE_NAME,
              reason: 'unreadable',
            },
          });
        }

        await store.actions.loadFile?.(file);
      };
    },

    reset() {
      return (store) => {
        store.metadata.workerCall?.cancel(SUPERSEDED);
        resetReview();
        store.setMetadata(makeInitialMetadata());
        store.setState(makeInitialState());
      };
    },
  },
});

export const workspaceActions = workspaceStore$.actions;

export const useWorkspacePhase = workspaceStore$.createSelectorHook(
  (state) => state.phase
);

export const useFacts = workspaceStore$.createSelectorHook(
  (state): FileFacts =>
    state.phase.status === 'ready' ? state.phase.facts : NO_FILE_FACTS
);

const SUPERSEDED = 'superseded';

function makeInitialState(): { phase: WorkspacePhase } {
  return { phase: { status: 'empty' } };
}

function makeInitialMetadata(): {
  load: symbol | null;
  workerCall: CancelablePromise<unknown> | null;
} {
  return { load: null, workerCall: null };
}
