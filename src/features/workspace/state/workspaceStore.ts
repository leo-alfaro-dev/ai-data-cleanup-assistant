import type { CancelablePromise } from 'easy-cancelable-promise';
import { createGlobalState } from 'react-global-state-hooks';
import type { FileFacts } from '@/engine/dataset/fileFacts';
import type { LoadFailureReason } from '@/engine/dataset/loadFailure';
import { tryCatch } from '@/lib/tryCatch';
import { getDatasetWorker } from '@/workers/getDatasetWorker';
import { LOAD_STAGES } from '@/workers/loadStage';
import type { SampleName } from '../sampleFile';
import { SAMPLE_RECIPE, SAMPLES } from '../sampleFile';
import { analysisActions } from './analysisStore';
import { applyRecipe } from './applyRecipe';
import { recipeActions, recipeStore$ } from './recipeStore';
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
        const hasRecipe = recipeStore$.getState().pending !== null;
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
          if (offset === 0) {
            void analysisActions.run({ runAi: !hasRecipe });
            if (hasRecipe) void applyRecipe();
          }
        }
      };
    },

    loadSample(name: SampleName = 'customers') {
      return async (store) => {
        const { url, fileName } = SAMPLES[name];
        store.metadata.workerCall?.cancel(SUPERSEDED);
        const load = Symbol(fileName);
        store.setMetadata({ load, workerCall: null });
        store.setState({
          phase: {
            status: 'loading',
            fileName,
            stage: 'reading',
            percentage: 0,
          },
        });

        const { result: file, error } = await tryCatch(() =>
          fetchAsFile({ url, fileName })
        );
        if (store.metadata.load !== load) return;
        if (error) {
          return store.setState({
            phase: { status: 'failed', fileName, reason: 'unreadable' },
          });
        }

        await store.actions.loadFile?.(file);
      };
    },

    loadNextMonthSample() {
      return async (store) => {
        store.setState({
          phase: {
            status: 'loading',
            fileName: SAMPLES.nextMonth.fileName,
            stage: 'reading',
            percentage: 0,
          },
        });
        const { result: recipeFile, error } = await tryCatch(() =>
          fetchAsFile({
            url: SAMPLE_RECIPE.url,
            fileName: SAMPLE_RECIPE.fileName,
          })
        );
        if (error) {
          return store.setState({
            phase: {
              status: 'failed',
              fileName: SAMPLE_RECIPE.fileName,
              reason: 'unreadable',
            },
          });
        }

        await recipeActions.chooseRecipe(recipeFile);
        await store.actions.loadSample?.('nextMonth');
      };
    },

    loadFiles(files: readonly File[]) {
      return async (store) => {
        const recipeFile = files.find(isRecipeFile);
        const dataFile = files.find((file) => !isRecipeFile(file));

        if (recipeFile) await recipeActions.chooseRecipe(recipeFile);
        const isRecipeRefused =
          recipeFile !== undefined && recipeStore$.getState().pending === null;
        if (dataFile && !isRecipeRefused) {
          await store.actions.loadFile?.(dataFile);
        }
      };
    },

    reset() {
      return (store) => {
        store.metadata.workerCall?.cancel(SUPERSEDED);
        resetReview();
        recipeActions.reset();
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

function isRecipeFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.json');
}

async function fetchAsFile({
  url,
  fileName,
}: {
  url: string;
  fileName: string;
}): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('sample not served');

  return new File([await response.blob()], fileName);
}
