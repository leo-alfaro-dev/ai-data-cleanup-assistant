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
        const existing = store.getState().previews.get(issueId);
        if (existing && existing.status !== 'failed') return;

        store.metadata.call?.cancel(SUPERSEDED);
        const call = getDatasetWorker().preview(change);
        store.setMetadata({ call });
        store.setState(({ previews }) => ({
          previews: withEntry({ map: previews, key: issueId, value: LOADING }),
        }));

        const { result, error } = await tryCatch(() => call);
        if (call.status === 'canceled') {
          return store.setState(({ previews }) => ({
            previews: withEntry({ map: previews, key: issueId, value: null }),
          }));
        }

        const entry: PreviewEntry =
          error || result === null
            ? { status: 'failed' }
            : { status: 'ready', preview: result };
        store.setState(({ previews }) => ({
          previews: withEntry({ map: previews, key: issueId, value: entry }),
        }));
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

export const previewActions = previewStore$.actions;

export function usePreview(issueId: IssueId): PreviewEntry | undefined {
  return usePreviews((previews) => previews.get(issueId), [issueId]);
}

const usePreviews = previewStore$.createSelectorHook((state) => state.previews);

const SUPERSEDED = 'superseded';

const LOADING: PreviewEntry = { status: 'loading' };

function makeInitialState(): { previews: Previews } {
  return { previews: new Map() };
}

function makeInitialMetadata(): { call: CancelablePromise<unknown> | null } {
  return { call: null };
}
