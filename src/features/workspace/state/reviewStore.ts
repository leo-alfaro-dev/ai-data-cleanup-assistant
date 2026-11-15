import { createGlobalState } from 'react-global-state-hooks';
import type { RowId } from '@/engine/dataset/dataset';
import type { Decision } from '@/engine/decisions/decision';
import type { Change } from '@/engine/changes/change';
import type {
  Confidence,
  Issue,
  IssueCategory,
  IssueId,
} from '@/engine/issues/issue';
import { commitDecisions } from './commitDecisions';
import type { DecisionBatch } from './decisionBatch';
import { listBulkAcceptable } from './listBulkAcceptable';
import { listBulkRejectable } from './listBulkRejectable';
import { previewActions } from './previewStore';
import { isEditable } from '@/engine/changes/isEditable';
import { isSameChange } from '@/engine/changes/isSameChange';
import { isValidEdit } from '@/engine/changes/isValidEdit';
import { effectiveChange } from '@/engine/decisions/effectiveChange';
import { readIssue } from './readIssue';
import { readIssues } from './readIssues';
import { readVisibleIssues } from './readVisibleIssues';
import type { ReviewState } from './reviewState';
import { stepHistory } from './stepHistory';

export const reviewStore$ = createGlobalState(makeInitialState(), {
  metadata: makeInitialMetadata(),
  actions: {
    select(issueId: IssueId | null) {
      return (store) => {
        if (store.getState().selectedIssueId !== issueId) {
          store.actions.cancelEdit?.();
        }
        store.setState((state) => ({
          ...state,
          selectedIssueId: issueId,
          focusedRow: null,
        }));
        store.actions.refreshPreview?.();
      };
    },

    refreshPreview() {
      return (store) => {
        const { selectedIssueId, decisions } = store.getState();
        const issue = readIssue({ issueId: selectedIssueId, decisions });
        const change = effectiveChange({
          suggestion: issue?.suggestion ?? null,
          decision: issue && decisions.get(issue.id),
        });
        if (issue && change) {
          void previewActions.load({ issueId: issue.id, change });
        }
      };
    },

    startEdit() {
      return (store) => {
        const { selectedIssueId, decisions } = store.getState();
        const issue = readIssue({ issueId: selectedIssueId, decisions });
        const change = effectiveChange({
          suggestion: issue?.suggestion ?? null,
          decision: issue && decisions.get(issue.id),
        });
        const isAlreadyEditing = issue?.id === store.getState().editingIssueId;
        if (!issue || !isEditable(change) || isAlreadyEditing) return;

        store.actions.showPanel?.('data');
        store.setState((state) => ({ ...state, editingIssueId: issue.id }));
        void previewActions.loadDraft(change);
      };
    },

    cancelEdit() {
      return (store) => {
        if (store.getState().editingIssueId === null) return;

        store.setState((state) => ({ ...state, editingIssueId: null }));
        previewActions.clearDraft();
      };
    },

    edit({ issueId, change }: { issueId: IssueId; change: Change }) {
      return (store) => {
        const original = readIssue({
          issueId,
          decisions: store.getState().decisions,
        })?.suggestion;
        if (!original || !isValidEdit({ original, edited: change })) return;

        const decision: Decision = isSameChange({
          first: original,
          second: change,
        })
          ? { status: 'accepted' }
          : { status: 'edited', change };
        store.setState((state) =>
          commitDecisions({ state, changes: new Map([[issueId, decision]]) })
        );
        store.actions.cancelEdit?.();
        store.actions.refreshPreview?.();
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
        const { decisions } = store.getState();
        const hasSuggestion = readIssue({ issueId, decisions })?.suggestion;
        if (!hasSuggestion || decisions.get(issueId)?.status === 'edited') {
          return;
        }

        store.setState((state) =>
          commitDecisions({
            state,
            changes: new Map([[issueId, { status: 'accepted' }]]),
          })
        );
        store.actions.refreshPreview?.();
      };
    },

    reject(issueId: IssueId) {
      return (store) => {
        if (!readIssue({ issueId, decisions: store.getState().decisions }))
          return;

        store.setState((state) =>
          commitDecisions({
            state,
            changes: new Map([[issueId, { status: 'rejected' }]]),
          })
        );
        store.actions.refreshPreview?.();
      };
    },

    resetDecision(issueId: IssueId) {
      return (store) => {
        store.setState((state) =>
          commitDecisions({ state, changes: new Map([[issueId, null]]) })
        );
        store.actions.refreshPreview?.();
      };
    },

    acceptAll({
      category,
      minimumConfidence = 'high',
    }: {
      category: IssueCategory;
      minimumConfidence?: Confidence;
    }) {
      return (store) => {
        const { decisions } = store.getState();
        const issues = listBulkAcceptable({
          issues: readIssues(decisions),
          decisions,
          category,
          minimumConfidence,
        });

        store.setState((state) =>
          commitDecisions({
            state,
            changes: toDecisions({ issues, status: 'accepted' }),
          })
        );
      };
    },

    acceptIssues(issueIds: readonly IssueId[]) {
      return (store) => {
        const { decisions } = store.getState();
        const wanted = new Set(issueIds);
        const issues = readIssues(decisions).filter(
          ({ id, suggestion }) => wanted.has(id) && suggestion !== null
        );

        store.setState((state) =>
          commitDecisions({
            state,
            changes: toDecisions({ issues, status: 'accepted' }),
          })
        );
      };
    },

    rejectAll({ category }: { category: IssueCategory }) {
      return (store) => {
        const { decisions } = store.getState();
        const issues = listBulkRejectable({
          issues: readIssues(decisions),
          decisions,
          category,
        });

        store.setState((state) =>
          commitDecisions({
            state,
            changes: toDecisions({ issues, status: 'rejected' }),
          })
        );
      };
    },

    selectNeighbor(step: 1 | -1) {
      return (store) => {
        const state = store.getState();
        const issues = readVisibleIssues(state);
        const current = issues.findIndex(
          ({ id }) => id === state.selectedIssueId
        );
        const index = (() => {
          if (current === -1) return step === 1 ? 0 : issues.length - 1;

          return Math.min(issues.length - 1, Math.max(0, current + step));
        })();
        const issue = issues[index];
        if (!issue) return;

        store.actions.select?.(issue.id);
        store.metadata.scrollToIssue?.(issue.id);
      };
    },

    acceptSelected() {
      return (store) => {
        const { selectedIssueId } = store.getState();
        if (selectedIssueId !== null) store.actions.accept?.(selectedIssueId);
      };
    },

    rejectSelected() {
      return (store) => {
        const { selectedIssueId } = store.getState();
        if (selectedIssueId !== null) store.actions.reject?.(selectedIssueId);
      };
    },

    toggleView() {
      return (store) =>
        store.setState((state) => ({
          ...state,
          view: state.view === 'cleaned' ? 'original' : 'cleaned',
        }));
    },

    jumpToSelectedRow() {
      return (store) => {
        const { selectedIssueId, decisions } = store.getState();
        const [rowId] =
          readIssue({ issueId: selectedIssueId, decisions })?.rows ?? [];
        if (rowId === undefined) return;

        store.actions.showPanel?.('data');
        store.actions.jumpToRow?.(rowId);
      };
    },

    undo() {
      return (store) => {
        store.setState((state) => stepHistory({ state, direction: 'undo' }));
        store.actions.refreshPreview?.();
      };
    },

    redo() {
      return (store) => {
        store.setState((state) => stepHistory({ state, direction: 'redo' }));
        store.actions.refreshPreview?.();
      };
    },

    forgetDecisions(issueIds: readonly IssueId[]) {
      return (store) => {
        const forgotten = new Set(issueIds);
        const { editingIssueId } = store.getState();
        if (editingIssueId !== null && forgotten.has(editingIssueId)) {
          previewActions.clearDraft();
        }
        const prune = (stack: readonly DecisionBatch[]) =>
          stack
            .map((batch) =>
              batch.filter(({ issueId }) => !forgotten.has(issueId))
            )
            .filter((batch) => batch.length > 0);

        store.setState((state) => ({
          ...state,
          decisions: new Map(
            [...state.decisions].filter(([issueId]) => !forgotten.has(issueId))
          ),
          undoStack: prune(state.undoStack),
          redoStack: prune(state.redoStack),
          selectedIssueId:
            state.selectedIssueId !== null &&
            forgotten.has(state.selectedIssueId)
              ? null
              : state.selectedIssueId,
          editingIssueId:
            state.editingIssueId !== null && forgotten.has(state.editingIssueId)
              ? null
              : state.editingIssueId,
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

    registerIssueList(scrollToIssue: (issueId: IssueId) => void) {
      return (store) => {
        store.setMetadata((metadata) => ({ ...metadata, scrollToIssue }));

        return () =>
          store.setMetadata((metadata) =>
            metadata.scrollToIssue === scrollToIssue
              ? { ...metadata, scrollToIssue: null }
              : metadata
          );
      };
    },

    registerGrid(scrollToRow: (rowId: RowId) => void) {
      return (store) => {
        store.setMetadata((metadata) => ({ ...metadata, scrollToRow }));

        return () =>
          store.setMetadata((metadata) =>
            metadata.scrollToRow === scrollToRow
              ? { ...metadata, scrollToRow: null }
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

export const useCanUndo = reviewStore$.createSelectorHook(
  (state) => state.undoStack.length > 0
);

export const useCanRedo = reviewStore$.createSelectorHook(
  (state) => state.redoStack.length > 0
);

export const useEditingIssueId = reviewStore$.createSelectorHook(
  (state) => state.editingIssueId
);

export const useLastStep = reviewStore$.createSelectorHook(
  (state) => state.lastStep
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

function toDecisions({
  issues,
  status,
}: {
  issues: readonly Issue[];
  status: 'accepted' | 'rejected';
}): ReadonlyMap<IssueId, Decision> {
  return new Map(issues.map(({ id }) => [id, { status }]));
}

function makeInitialState(): ReviewState {
  return {
    selectedIssueId: null,
    categoryFilter: null,
    decisions: new Map(),
    undoStack: [],
    redoStack: [],
    lastStep: null,
    editingIssueId: null,
    view: 'cleaned',
    panel: 'issues',
    isOnlyIssueRows: false,
    focusedRow: null,
  };
}

function makeInitialMetadata(): {
  scrollToRow: ((rowId: RowId) => void) | null;
  scrollToIssue: ((issueId: IssueId) => void) | null;
} {
  return { scrollToRow: null, scrollToIssue: null };
}
