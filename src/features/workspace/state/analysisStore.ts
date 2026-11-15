import type { CancelablePromise } from 'easy-cancelable-promise';
import { createGlobalState } from 'react-global-state-hooks';
import type { Issue } from '@/engine/issues/issue';
import type { ColumnProfile } from '@/engine/profile/columnProfile';
import { tryCatch } from '@/lib/tryCatch';
import { ANALYSIS_STAGES } from '@/workers/analysisStage';
import { getDatasetWorker } from '@/workers/getDatasetWorker';
import { aiActions } from './aiStore';
import type { AnalysisPhase } from './analysisPhase';

export const analysisStore$ = createGlobalState(makeInitialState(), {
  metadata: makeInitialMetadata(),
  actions: {
    run({ runAi = true }: { runAi?: boolean } = {}) {
      return async (store) => {
        store.metadata.call?.cancel(SUPERSEDED);

        const run = Symbol('analysis');
        const isCurrent = () => store.metadata.run === run;
        store.setMetadata({ run, call: null });
        store.setState({
          phase: { status: 'running', stage: 'profiling', percentage: 0 },
        });

        const call = getDatasetWorker()
          .analyze()
          .onProgress((percentage, payload) => {
            const stage = ANALYSIS_STAGES.find((option) => option === payload);
            if (!stage || !isCurrent()) return;

            store.setState({
              phase: { status: 'running', stage, percentage },
            });
          });
        store.setMetadata({ run, call });

        const { result, error } = await tryCatch(() => call);
        if (!isCurrent()) return;
        if (error || result === null) {
          return store.setState({ phase: { status: 'failed' } });
        }

        store.setState({ phase: { status: 'done', result } });
        if (runAi) void aiActions.startRun();
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

export const analysisActions = analysisStore$.actions;

// The selector hooks below run their selector at creation, so these are declared first.
const NO_ISSUES: readonly Issue[] = [];

const NO_PROFILE: readonly ColumnProfile[] = [];

export const useAnalysisPhase = analysisStore$.createSelectorHook(
  (state) => state.phase
);

export const useCheckIssues = analysisStore$.createSelectorHook(
  (state): readonly Issue[] =>
    state.phase.status === 'done' ? state.phase.result.issues : NO_ISSUES
);

export const useProfile = analysisStore$.createSelectorHook(
  (state): readonly ColumnProfile[] =>
    state.phase.status === 'done' ? state.phase.result.profile : NO_PROFILE
);

const SUPERSEDED = 'superseded';

function makeInitialState(): { phase: AnalysisPhase } {
  return { phase: { status: 'idle' } };
}

function makeInitialMetadata(): {
  run: symbol | null;
  call: CancelablePromise<unknown> | null;
} {
  return { run: null, call: null };
}
