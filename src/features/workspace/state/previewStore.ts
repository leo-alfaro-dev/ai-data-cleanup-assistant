import type { CancelablePromise } from 'easy-cancelable-promise';
import { createGlobalState } from 'react-global-state-hooks';
import type { Change } from '@/engine/changes/change';
import type { IssueId } from '@/engine/issues/issue';
import { tryCatch } from '@/lib/tryCatch';
import { withEntry } from '@/lib/withEntry';
import { getDatasetWorker } from '@/workers/getDatasetWorker';
import type { PreviewEntry } from './previewEntry';

type Previews = ReadonlyMap<IssueId, PreviewEntry>;

export const previewStore$ = createGlobalState(makeInitialState(), {
  metadata: makeInitialMetadata(),
  actions: {
    load({ issueId, change }: { issueId: IssueId; change: Change }) {
      return async (store) => {
        const { previews, loadedChanges } = store.getState();
        const existing = previews.get(issueId);
        const isCurrent = loadedChanges.get(issueId) === change;
        if (existing && existing.status !== 'failed' && isCurrent) return;

        store.metadata.call?.cancel(SUPERSEDED);
        const call = getDatasetWorker().preview(change);
        store.setMetadata((metadata) => ({ ...metadata, call }));
        store.setState((state) => ({
          ...state,
          previews: withEntry({
            map: state.previews,
            key: issueId,
            value: LOADING,
          }),
          loadedChanges: withEntry({
            map: state.loadedChanges,
            key: issueId,
            value: change,
          }),
        }));

        const { result, error } = await tryCatch(() => call);
        const isSuperseded = () =>
          store.getState().loadedChanges.get(issueId) !== change;
        if (call.status === 'canceled') {
          if (isSuperseded()) return;

          return store.setState((state) => ({
            ...state,
            previews: withEntry({
              map: state.previews,
              key: issueId,
              value: null,
            }),
            loadedChanges: withEntry({
              map: state.loadedChanges,
              key: issueId,
              value: null,
            }),
          }));
        }
        if (isSuperseded()) return;

        const entry: PreviewEntry =
          error || result === null
            ? { status: 'failed' }
            : { status: 'ready', preview: result };
        store.setState((state) => ({
          ...state,
          previews: withEntry({
            map: state.previews,
            key: issueId,
            value: entry,
          }),
        }));
      };
    },

    loadDraft(change: Change) {
      return async (store) => {
        store.metadata.draftCall?.cancel(SUPERSEDED);
        const call = getDatasetWorker().preview(change);
        store.setMetadata((metadata) => ({ ...metadata, draftCall: call }));
        store.setState((state) => ({ ...state, draft: LOADING }));

        const { result, error } = await tryCatch(() => call);
        if (call.status === 'canceled') return;

        const draft: PreviewEntry =
          error || result === null
            ? { status: 'failed' }
            : { status: 'ready', preview: result };
        store.setState((state) => ({ ...state, draft }));
      };
    },

    clearDraft() {
      return (store) => {
        store.metadata.draftCall?.cancel(SUPERSEDED);
        store.setMetadata((metadata) => ({ ...metadata, draftCall: null }));
        store.setState((state) => ({ ...state, draft: null }));
      };
    },

    reset() {
      return (store) => {
        store.metadata.call?.cancel(SUPERSEDED);
        store.metadata.draftCall?.cancel(SUPERSEDED);
        store.setMetadata(makeInitialMetadata());
        store.setState(makeInitialState());
      };
    },
  },
});

export const previewActions = previewStore$.actions;

export const useDraftPreview = previewStore$.createSelectorHook(
  (state) => state.draft
);

export function usePreview(issueId: IssueId): PreviewEntry | undefined {
  return usePreviews((previews) => previews.get(issueId), [issueId]);
}

const usePreviews = previewStore$.createSelectorHook((state) => state.previews);

const SUPERSEDED = 'superseded';

const LOADING: PreviewEntry = { status: 'loading' };

function makeInitialState(): {
  previews: Previews;
  loadedChanges: ReadonlyMap<IssueId, Change>;
  draft: PreviewEntry | null;
} {
  return { previews: new Map(), loadedChanges: new Map(), draft: null };
}

function makeInitialMetadata(): {
  call: CancelablePromise<unknown> | null;
  draftCall: CancelablePromise<unknown> | null;
} {
  return { call: null, draftCall: null };
}
