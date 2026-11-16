import type { CancelablePromise } from 'easy-cancelable-promise';
import { createGlobalState } from 'react-global-state-hooks';
import { listAcceptedChanges } from '@/engine/decisions/listAcceptedChanges';
import { tryCatch } from '@/lib/tryCatch';
import { getDatasetWorker } from '@/workers/getDatasetWorker';
import { analysisStore$ } from './analysisStore';
import type { ExportPhase } from './exportPhase';
import { readIssues } from './readIssues';
import { reviewStore$ } from './reviewStore';

export const exportStore$ = createGlobalState(makeInitialState(), {
  metadata: makeInitialMetadata(),
  actions: {
    open() {
      return async (store) => {
        store.metadata.call?.cancel(SUPERSEDED);

        const { phase } = analysisStore$.getState();
        const { decisions } = reviewStore$.getState();
        const issues = readIssues(decisions);
        const accepted = listAcceptedChanges({ issues, decisions });
        const pendingCount =
          phase.status === 'done'
            ? issues.filter(({ id }) => !decisions.has(id)).length
            : null;

        const run = Symbol('export');
        const isCurrent = () => store.metadata.run === run;
        const call = getDatasetWorker().exportFiles(accepted);
        store.setMetadata({ run, call });
        store.setState({ phase: { status: 'running' } });

        const { result, error } = await tryCatch(() => call);
        if (!isCurrent()) return;
        if (error || result === null) {
          return store.setState({ phase: { status: 'failed' } });
        }

        store.setState({
          phase: { status: 'ready', files: result, pendingCount },
        });
      };
    },

    close() {
      return (store) => {
        if (store.getState().phase.status === 'running') return;

        store.setMetadata(makeInitialMetadata());
        store.setState(makeInitialState());
      };
    },

    reset() {
      return (store) => {
        store.metadata.call?.cancel(SUPERSEDED);
        store.setMetadata(makeInitialMetadata());
        store.setState(makeInitialState());
      };
    },
  },
});

export const exportActions = exportStore$.actions;

export const useExportPhase = exportStore$.createSelectorHook(
  (state) => state.phase
);

const SUPERSEDED = 'superseded';

function makeInitialState(): { phase: ExportPhase } {
  return { phase: { status: 'closed' } };
}

function makeInitialMetadata(): {
  run: symbol | null;
  call: CancelablePromise<unknown> | null;
} {
  return { run: null, call: null };
}
