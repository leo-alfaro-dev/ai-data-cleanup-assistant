import type { CancelablePromise } from 'easy-cancelable-promise';
import { createGlobalState } from 'react-global-state-hooks';
import { postAiJob } from '@/ai/postAiJob';
import type { AiTaskName } from '@/ai/aiTaskName';
import type { HostedQuota } from '@/ai/hostedQuota';
import type { AiNote } from '@/engine/issues/aiNote';
import type { Issue } from '@/engine/issues/issue';
import { tryCatch } from '@/lib/tryCatch';
import { getDatasetWorker } from '@/workers/getDatasetWorker';
import type { AiCallEntry } from './aiCallEntry';
import type { AiJob } from './aiJob';
import type { AiRun } from './aiRun';
import { buildAiJobs } from './buildAiJobs';
import { isAiRunInFlight } from './isAiRunInFlight';
import { latestQuota } from './latestQuota';
import type { RunId } from './runId';
import { toRunId } from './runId';
import { runAiJobs } from './runAiJobs';
import { settingsStore$ } from './settingsStore';
import { toAiCallEntry } from './toAiCallEntry';
import { withJobState } from './withJobState';

export const aiStore$ = createGlobalState(makeInitialState(), {
  metadata: makeInitialMetadata(),
  actions: {
    startRun() {
      return async (store) => {
        store.metadata.controller?.abort();
        store.metadata.call?.cancel(SUPERSEDED);

        const runId = toRunId(store.metadata.lastRunId + 1);
        const isCurrent = () => store.metadata.runId === runId;
        store.setMetadata({
          lastRunId: runId,
          runId,
          controller: new AbortController(),
          call: null,
        });
        store.setState((state) => ({
          ...state,
          run: null,
          issues: [],
          notes: [],
          rejectedKeyRevision: null,
          isPreparing: true,
        }));

        const call = getDatasetWorker().buildAiRequests();
        store.setMetadata((metadata) => ({ ...metadata, call }));
        const { result: requests, error } = await tryCatch(() => call);
        if (!isCurrent()) return;
        if (error || !requests) {
          return store.setState((state) => ({ ...state, isPreparing: false }));
        }

        const jobs = buildAiJobs(requests);
        const model = settingsStore$.getState().modelId;
        store.setState((state) => ({
          ...state,
          run: { runId, model, jobs },
          isPreparing: false,
        }));
        await store.actions.runJobs?.(jobs);
      };
    },

    retryTask(task: AiTaskName) {
      return async (store) => {
        const state = store.getState();
        if (isAiRunInFlight(state)) return;

        const failed = (state.run?.jobs ?? []).filter(
          ({ request, state: jobState }) =>
            request.task === task && jobState.status === 'failed'
        );
        if (failed.length > 0) await store.actions.runJobs?.(failed);
      };
    },

    runJobs(jobs: readonly AiJob[]) {
      return async (store) => {
        const { runId, controller } = store.metadata;
        const model = store.getState().run?.model;
        if (runId === null || controller === null || model === undefined)
          return;

        const { ownKey, ownKeyRevision } = settingsStore$.getState();

        await runAiJobs({
          jobs,
          signal: controller.signal,
          isCurrent: () => store.metadata.runId === runId,
          post: async (request) => {
            const answer = await postAiJob({
              job: request,
              model,
              ownKey,
              signal: controller.signal,
            });
            const { quota } = answer;
            if (quota) {
              store.setState((current) => ({
                ...current,
                quota: latestQuota({ current: current.quota, incoming: quota }),
              }));
            }

            return answer;
          },
          buildIssues: (taskResult) =>
            getDatasetWorker().buildAiIssues(taskResult),
          onState: ({ key, state }) =>
            store.setState((current) => ({
              ...current,
              run: withJobState({ run: current.run, key, state }),
            })),
          onSettled: ({ job, body, outcome, issues, notes }) =>
            store.setState((current) => ({
              ...current,
              rejectedKeyRevision:
                !outcome.ok && outcome.reason === 'invalidKey'
                  ? ownKeyRevision
                  : current.rejectedKeyRevision,
              issues: [...current.issues, ...issues],
              notes: [...current.notes, ...notes],
              calls: [
                ...current.calls,
                toAiCallEntry({
                  runId,
                  model,
                  job,
                  body,
                  outcome,
                  sequence: current.calls.length,
                }),
              ],
            })),
        });
      };
    },

    reset() {
      return (store) => {
        store.metadata.controller?.abort();
        store.metadata.call?.cancel(SUPERSEDED);
        store.setMetadata({
          ...makeInitialMetadata(),
          lastRunId: store.metadata.lastRunId,
        });
        store.setState(makeInitialState());
      };
    },
  },
});

export const aiActions = aiStore$.actions;

export const useAiRun = aiStore$.createSelectorHook((state) => state.run);

export const useAiCalls = aiStore$.createSelectorHook((state) => state.calls);

export const useAiNotes = aiStore$.createSelectorHook((state) => state.notes);

export const useHostedQuota = aiStore$.createSelectorHook(
  (state) => state.quota
);

// A request the server never answered recorded no call, so it is not a call to sum up.
export const useHasAiCalls = aiStore$.createSelectorHook((state) =>
  state.calls.some(({ records }) => records.length > 0)
);

export const useRejectedKeyRevision = aiStore$.createSelectorHook(
  (state) => state.rejectedKeyRevision
);

// True from the start of a run until its last request has settled.
export const useIsAiRunning = aiStore$.createSelectorHook(isAiRunInFlight);

// Declared before the hook that uses it: a selector hook runs its selector when it is created.
const NO_ISSUES: readonly Issue[] = [];

export const useAiIssues = aiStore$.createSelectorHook(
  (state): readonly Issue[] => state.issues ?? NO_ISSUES
);

const SUPERSEDED = 'superseded';

function makeInitialState(): {
  run: AiRun | null;
  issues: readonly Issue[];
  notes: readonly AiNote[];
  rejectedKeyRevision: number | null;
  calls: readonly AiCallEntry[];
  quota: HostedQuota | null;
  isPreparing: boolean;
} {
  return {
    run: null,
    issues: [],
    notes: [],
    rejectedKeyRevision: null,
    calls: [],
    quota: null,
    isPreparing: false,
  };
}

function makeInitialMetadata(): {
  lastRunId: number;
  runId: RunId | null;
  controller: AbortController | null;
  call: CancelablePromise<unknown> | null;
} {
  return { lastRunId: 0, runId: null, controller: null, call: null };
}
