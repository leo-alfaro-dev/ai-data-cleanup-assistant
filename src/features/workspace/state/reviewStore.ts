import { createGlobalState } from 'react-global-state-hooks';
import type { RowId } from '@/engine/dataset/dataset';
import type { Decision } from '@/engine/decisions/decision';
import type { IssueId } from '@/engine/issues/issue';
import { withEntry } from '@/lib/withEntry';
import { previewActions } from './previewStore';
import { readIssue } from './readIssue';
import type { ReviewState } from './reviewState';

export const reviewStore$ = createGlobalState(makeInitialState(), {
  metadata: makeInitialMetadata(),
  actions: {
    select(issueId: IssueId | null) {
      return (store) => {
        store.setState((state) => ({
          ...state,
          selectedIssueId: issueId,
          focusedRow: null,
        }));

        const issue = readIssue(issueId);
        if (issue?.suggestion) {
          void previewActions.load({
            issueId: issue.id,
            change: issue.suggestion,
          });
        }
      };
    },

    filterByCategory(category: ReviewState['categoryFilter']) {
      return (store) => {
        store.setState((state) => ({
          ...state,
          categoryFilter: state.categoryFilter === category ? null : category,
        }));
      };
    },

    accept(issueId: IssueId) {
      return (store) => {
        if (!readIssue(issueId)?.suggestion) return;

        store.setState((state) => ({
          ...state,
          decisions: withEntry({
            map: state.decisions,
            key: issueId,
            value: { status: 'accepted' },
          }),
        }));
      };
    },

    reject(issueId: IssueId) {
      return (store) => {
        if (!readIssue(issueId)) return;

        store.setState((state) => ({
          ...state,
          decisions: withEntry({
            map: state.decisions,
            key: issueId,
            value: { status: 'rejected' },
          }),
        }));
      };
    },

    resetDecision(issueId: IssueId) {
      return (store) => {
        store.setState((state) => ({
          ...state,
          decisions: withEntry({
            map: state.decisions,
            key: issueId,
            value: null,
          }),
        }));
      };
    },

    showView(view: ReviewState['view']) {
      return (store) => store.setState((state) => ({ ...state, view }));
    },

    showPanel(panel: ReviewState['panel']) {
      return (store) => store.setState((state) => ({ ...state, panel }));
    },

    toggleOnlyIssueRows() {
      return (store) => {
        store.setState((state) => ({
          ...state,
          isOnlyIssueRows: !state.isOnlyIssueRows,
        }));
      };
    },

    jumpToRow(rowId: RowId) {
      return (store) => {
        store.setState((state) => ({ ...state, focusedRow: rowId }));
        store.metadata.scrollToRow?.(rowId);
      };
    },

    registerGrid(scrollToRow: (rowId: RowId) => void) {
      return (store) => {
        store.setMetadata({ scrollToRow });

        return () =>
          store.setMetadata((metadata) =>
            metadata.scrollToRow === scrollToRow
              ? { scrollToRow: null }
              : metadata
          );
      };
    },

    reset() {
      return (store) => store.setState(makeInitialState());
    },
  },
});

export const reviewActions = reviewStore$.actions;

export const useSelectedIssueId = reviewStore$.createSelectorHook(
  (state) => state.selectedIssueId
);

export const useCategoryFilter = reviewStore$.createSelectorHook(
  (state) => state.categoryFilter
);

export const useDecisions = reviewStore$.createSelectorHook(
  (state) => state.decisions
);

export const useReviewView = reviewStore$.createSelectorHook(
  (state) => state.view
);

export const useReviewPanel = reviewStore$.createSelectorHook(
  (state) => state.panel
);

export const useIsOnlyIssueRows = reviewStore$.createSelectorHook(
  (state) => state.isOnlyIssueRows
);

export const useFocusedRow = reviewStore$.createSelectorHook(
  (state) => state.focusedRow
);

export function useDecision(issueId: IssueId): Decision | undefined {
  return useDecisions((decisions) => decisions.get(issueId), [issueId]);
}

function makeInitialState(): ReviewState {
  return {
    selectedIssueId: null,
    categoryFilter: null,
    decisions: new Map(),
    view: 'cleaned',
    panel: 'issues',
    isOnlyIssueRows: false,
    focusedRow: null,
  };
}

function makeInitialMetadata(): {
  scrollToRow: ((rowId: RowId) => void) | null;
} {
  return { scrollToRow: null };
}
