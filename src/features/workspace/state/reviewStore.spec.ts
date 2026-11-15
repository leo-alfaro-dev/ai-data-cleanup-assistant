import { CancelablePromise } from 'easy-cancelable-promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Change } from '@/engine/changes/change';
import type { ChangePreview } from '@/engine/changes/changePreview';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toIssueId } from '@/engine/issues/toIssueId';
import { readIssue } from './readIssue';
import { makeIssue } from '../testing/makeIssue';
import { seedIssues } from '../testing/seedIssues';
import { seedWorkspace } from '../testing/seedWorkspace';
import { analysisStore$ } from './analysisStore';
import { previewStore$ } from './previewStore';
import { reviewActions, reviewStore$ } from './reviewStore';

const { worker } = vi.hoisted(() => ({
  worker: {
    preview:
      vi.fn<(change: Change) => CancelablePromise<ChangePreview | null>>(),
  },
}));

vi.mock('@/workers/getDatasetWorker', () => ({
  getDatasetWorker: () => worker,
}));

const trimmed = toIssueId('whitespace:0');

describe('reviewStore', () => {
  beforeEach(() => {
    worker.preview.mockReset();
    worker.preview.mockReturnValue(CancelablePromise.resolve(null));
    seedWorkspace(
      'name,city',
      ' Ada ,Paris',
      'Bo ,Rome',
      'Cy,Oslo',
      'Di,',
      'Ed,',
      'Flo,Oslo',
      'Gus,Rome',
      'Hal,Paris',
      'Ivy,Paris',
      'Jo,Rome'
    );
  });

  describe('decisions', () => {
    it('accepts an issue that has a suggestion', () => {
      reviewActions.accept(trimmed);

      expect(reviewStore$.getState().decisions.get(trimmed)).toEqual({
        status: 'accepted',
      });
    });

    it('does not accept an issue without a suggestion, or one the file does not have', () => {
      const withoutSuggestion = findIssue((issue) => issue.suggestion === null);

      reviewActions.accept(withoutSuggestion.id);
      reviewActions.accept(toIssueId('gone'));

      expect(reviewStore$.getState().decisions.size).toBe(0);
    });

    it('stores a dismissal of an issue without a suggestion as a rejection', () => {
      const withoutSuggestion = findIssue((issue) => issue.suggestion === null);

      reviewActions.reject(withoutSuggestion.id);

      expect(
        reviewStore$.getState().decisions.get(withoutSuggestion.id)
      ).toEqual({ status: 'rejected' });
    });

    it('does not reject an issue the file does not have', () => {
      reviewActions.reject(toIssueId('gone'));

      expect(reviewStore$.getState().decisions.size).toBe(0);
    });

    it('undoes a decision by resetting it', () => {
      reviewActions.accept(trimmed);

      reviewActions.resetDecision(trimmed);

      expect(reviewStore$.getState().decisions.has(trimmed)).toBe(false);
    });

    it('changes one entry of a new map and leaves the previous map as it was', () => {
      reviewActions.accept(trimmed);
      const before = reviewStore$.getState().decisions;

      reviewActions.reject(trimmed);

      expect(before.get(trimmed)).toEqual({ status: 'accepted' });
      expect(reviewStore$.getState().decisions).not.toBe(before);
    });
  });

  describe('bulk decisions and history', () => {
    const trim: Change = { kind: 'trimWhitespace', column: toColumnKey(0) };
    const decisionOf = (id: string) =>
      reviewStore$.getState().decisions.get(toIssueId(id));

    beforeEach(() => {
      seedIssues({
        lines: ['name', 'Ada'],
        issues: [
          makeIssue({ id: 'certain', confidence: 'certain', suggestion: trim }),
          makeIssue({ id: 'high', confidence: 'high', suggestion: trim }),
          makeIssue({ id: 'medium', confidence: 'medium', suggestion: trim }),
          makeIssue({ id: 'low', confidence: 'low', suggestion: trim }),
          makeIssue({ id: 'bare', confidence: 'certain' }),
          makeIssue({
            id: 'other',
            category: 'missing',
            confidence: 'certain',
            suggestion: trim,
          }),
        ],
      });
    });

    it('accepts every pending suggestion of the category that is certain or high, and nothing else', () => {
      reviewActions.acceptAll({ category: 'inconsistent' });

      const accepted = [...reviewStore$.getState().decisions.keys()].sort();
      expect(accepted).toEqual(['certain', 'high']);
    });

    it('accepts down to the confidence it is widened to, never an issue without a suggestion', () => {
      reviewActions.acceptAll({
        category: 'inconsistent',
        minimumConfidence: 'low',
      });

      expect(reviewStore$.getState().decisions.size).toBe(4);
      expect(decisionOf('bare')).toBeUndefined();
    });

    it('leaves issues that are already decided as they are', () => {
      reviewActions.reject(toIssueId('high'));

      reviewActions.acceptAll({ category: 'inconsistent' });

      expect(decisionOf('high')).toEqual({ status: 'rejected' });
      expect(decisionOf('certain')).toEqual({ status: 'accepted' });
    });

    it('rejects every pending issue of the category, with or without a suggestion', () => {
      reviewActions.rejectAll({ category: 'inconsistent' });

      expect(reviewStore$.getState().decisions.size).toBe(5);
      expect(decisionOf('other')).toBeUndefined();
    });

    it('undoes a bulk accept in one step and redoes it in one step', () => {
      reviewActions.acceptAll({ category: 'inconsistent' });

      reviewActions.undo();
      expect(reviewStore$.getState().decisions.size).toBe(0);

      reviewActions.redo();
      expect(reviewStore$.getState().decisions.size).toBe(2);
    });

    it('undoes single decisions one at a time, newest first, restoring what was decided before', () => {
      reviewActions.accept(toIssueId('certain'));
      reviewActions.reject(toIssueId('certain'));
      reviewActions.resetDecision(toIssueId('certain'));

      reviewActions.undo();
      expect(decisionOf('certain')).toEqual({ status: 'rejected' });
      reviewActions.undo();
      expect(decisionOf('certain')).toEqual({ status: 'accepted' });
      reviewActions.undo();
      expect(decisionOf('certain')).toBeUndefined();
    });

    it('clears redo when a new decision is made', () => {
      reviewActions.accept(toIssueId('certain'));
      reviewActions.undo();
      expect(reviewStore$.getState().redoStack).toHaveLength(1);

      reviewActions.accept(toIssueId('high'));

      expect(reviewStore$.getState().redoStack).toHaveLength(0);
      reviewActions.redo();
      expect(decisionOf('certain')).toBeUndefined();
    });

    it('records no step for a decision that changes nothing', () => {
      reviewActions.accept(toIssueId('certain'));
      reviewActions.accept(toIssueId('certain'));
      reviewActions.acceptAll({ category: 'inconsistent' });
      reviewActions.acceptAll({ category: 'inconsistent' });

      expect(reviewStore$.getState().undoStack).toHaveLength(2);
    });

    it('does nothing on undo and redo with an empty history', () => {
      reviewActions.undo();
      reviewActions.redo();

      expect(reviewStore$.getState().decisions.size).toBe(0);
    });

    it('drops forgotten issues from the history, so undo cannot bring their decisions back', () => {
      reviewActions.acceptAll({ category: 'inconsistent' });
      reviewActions.forgetDecisions([toIssueId('certain')]);

      reviewActions.undo();

      expect(reviewStore$.getState().decisions.size).toBe(0);
      reviewActions.redo();
      expect(decisionOf('certain')).toBeUndefined();
      expect(decisionOf('high')).toEqual({ status: 'accepted' });
    });
  });

  describe('editing a suggestion', () => {
    const column = toColumnKey(0);
    const suggestion: Change = {
      kind: 'mapValues',
      column,
      groups: [{ canonical: 'Paris', variants: ['paris', 'PARIS'] }],
    };
    const edited: Change = {
      kind: 'mapValues',
      column,
      groups: [{ canonical: 'Paris City', variants: ['paris'] }],
    };

    beforeEach(() => {
      seedIssues({
        lines: ['city', 'paris'],
        issues: [makeIssue({ id: 'map', suggestion })],
      });
    });

    it('stores a valid edit as the decision and keeps the suggestion on the issue', () => {
      reviewActions.select(toIssueId('map'));
      reviewActions.startEdit();
      expect(reviewStore$.getState().editingIssueId).toBe('map');

      reviewActions.edit({ issueId: toIssueId('map'), change: edited });

      expect(reviewStore$.getState().decisions.get(toIssueId('map'))).toEqual({
        status: 'edited',
        change: edited,
      });
      expect(reviewStore$.getState().editingIssueId).toBeNull();
      expect(
        readIssue({
          issueId: toIssueId('map'),
          decisions: reviewStore$.getState().decisions,
        })?.suggestion
      ).toBe(suggestion);
    });

    it('stores an edit that is the suggestion itself as a plain accept', () => {
      reviewActions.edit({
        issueId: toIssueId('map'),
        change: JSON.parse(JSON.stringify(suggestion)),
      });

      expect(reviewStore$.getState().decisions.get(toIssueId('map'))).toEqual({
        status: 'accepted',
      });
    });

    it('does not turn an edit into a plain accept', () => {
      reviewActions.edit({ issueId: toIssueId('map'), change: edited });

      reviewActions.accept(toIssueId('map'));

      expect(reviewStore$.getState().decisions.get(toIssueId('map'))).toEqual({
        status: 'edited',
        change: edited,
      });
    });

    it('opens the editor once, and not again while it is open', () => {
      reviewActions.select(toIssueId('map'));
      reviewActions.startEdit();

      reviewActions.startEdit();

      expect(reviewStore$.getState().editingIssueId).toBe('map');
    });

    it('keeps the editor open when the selected issue is selected again', () => {
      reviewActions.select(toIssueId('map'));
      reviewActions.startEdit();

      reviewActions.select(toIssueId('map'));

      expect(reviewStore$.getState().editingIssueId).toBe('map');
    });

    it('closes the editor when the issue being edited is forgotten', () => {
      reviewActions.select(toIssueId('map'));
      reviewActions.startEdit();

      reviewActions.forgetDecisions([toIssueId('map')]);

      expect(reviewStore$.getState().editingIssueId).toBeNull();
    });

    it('refuses an edit that cites a value the suggestion never named', () => {
      reviewActions.edit({
        issueId: toIssueId('map'),
        change: {
          ...edited,
          groups: [{ canonical: 'Paris', variants: ['Lyon'] }],
        },
      });

      expect(reviewStore$.getState().decisions.size).toBe(0);
    });

    it('drops the edit on undo and brings it back on redo', () => {
      reviewActions.edit({ issueId: toIssueId('map'), change: edited });

      reviewActions.undo();
      expect(reviewStore$.getState().decisions.size).toBe(0);
      reviewActions.redo();

      expect(reviewStore$.getState().decisions.get(toIssueId('map'))).toEqual({
        status: 'edited',
        change: edited,
      });
    });

    it('does not open the editor for a suggestion that has none', () => {
      seedIssues({
        lines: ['city', 'paris'],
        issues: [
          makeIssue({
            id: 'trim',
            suggestion: { kind: 'trimWhitespace', column },
          }),
        ],
      });
      reviewActions.select(toIssueId('trim'));

      reviewActions.startEdit();

      expect(reviewStore$.getState().editingIssueId).toBeNull();
    });

    it('closes the editor when another issue is selected', () => {
      reviewActions.select(toIssueId('map'));
      reviewActions.startEdit();

      reviewActions.select(null);

      expect(reviewStore$.getState().editingIssueId).toBeNull();
    });
  });

  describe('selection', () => {
    it('selects an issue and loads the preview of its suggestion', () => {
      reviewActions.select(trimmed);

      expect(reviewStore$.getState().selectedIssueId).toBe(trimmed);
      expect(worker.preview).toHaveBeenCalledWith({
        kind: 'trimWhitespace',
        column: 0,
      });
    });

    it('loads no preview for an issue without a suggestion', () => {
      const withoutSuggestion = findIssue((issue) => issue.suggestion === null);

      reviewActions.select(withoutSuggestion.id);

      expect(worker.preview).not.toHaveBeenCalled();
      expect(previewStore$.getState().previews.size).toBe(0);
    });

    it('clears the selection and the focused row', () => {
      reviewActions.select(trimmed);
      reviewActions.jumpToRow(toRowId(3));

      reviewActions.select(null);

      expect(reviewStore$.getState()).toMatchObject({
        selectedIssueId: null,
        focusedRow: null,
      });
    });
  });

  describe('filters and views', () => {
    it('filters by a category and clears the filter when it is chosen again', () => {
      reviewActions.filterByCategory('missing');
      expect(reviewStore$.getState().categoryFilter).toBe('missing');

      reviewActions.filterByCategory('duplicate');
      expect(reviewStore$.getState().categoryFilter).toBe('duplicate');

      reviewActions.filterByCategory('duplicate');
      expect(reviewStore$.getState().categoryFilter).toBeNull();
    });

    it('shows the cleaned values first and switches to the original and back', () => {
      expect(reviewStore$.getState().view).toBe('cleaned');

      reviewActions.showView('original');
      expect(reviewStore$.getState().view).toBe('original');

      reviewActions.showView('cleaned');
      expect(reviewStore$.getState().view).toBe('cleaned');
    });

    it('toggles listing only the rows of the issue', () => {
      reviewActions.toggleOnlyIssueRows();
      expect(reviewStore$.getState().isOnlyIssueRows).toBe(true);

      reviewActions.toggleOnlyIssueRows();
      expect(reviewStore$.getState().isOnlyIssueRows).toBe(false);
    });

    it('switches panel', () => {
      reviewActions.showPanel('data');

      expect(reviewStore$.getState().panel).toBe('data');
    });
  });

  describe('the grid', () => {
    it('marks the row it jumps to and asks the registered grid to scroll to it', () => {
      const scrollToRow = vi.fn();
      reviewActions.registerGrid(scrollToRow);

      reviewActions.jumpToRow(toRowId(7));

      expect(scrollToRow).toHaveBeenCalledWith(7);
      expect(reviewStore$.getState().focusedRow).toBe(7);
    });

    it('still marks the row when no grid is registered', () => {
      reviewActions.jumpToRow(toRowId(7));

      expect(reviewStore$.getState().focusedRow).toBe(7);
    });

    it('stops scrolling a grid once it unregisters', () => {
      const scrollToRow = vi.fn();
      const unregister = reviewActions.registerGrid(scrollToRow);

      unregister();
      reviewActions.jumpToRow(toRowId(7));

      expect(scrollToRow).not.toHaveBeenCalled();
    });

    it('keeps a newer grid when an older one unregisters late', () => {
      const older = vi.fn();
      const newer = vi.fn();
      const unregisterOlder = reviewActions.registerGrid(older);
      reviewActions.registerGrid(newer);

      unregisterOlder();
      reviewActions.jumpToRow(toRowId(2));

      expect(newer).toHaveBeenCalledWith(2);
      expect(older).not.toHaveBeenCalled();
    });
  });

  it('returns to the initial state on reset, keeping the registered grid', () => {
    const scrollToRow = vi.fn();
    reviewActions.registerGrid(scrollToRow);
    reviewActions.accept(trimmed);
    reviewActions.select(trimmed);
    reviewActions.filterByCategory('missing');
    reviewActions.showView('original');

    reviewActions.reset();

    expect(reviewStore$.getState()).toEqual({
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
    });
    reviewActions.jumpToRow(toRowId(1));
    expect(scrollToRow).toHaveBeenCalledWith(1);
  });
});

function findIssue(predicate: (issue: Issue) => boolean): Issue {
  const { phase } = analysisStore$.getState();
  const issue =
    phase.status === 'done' ? phase.result.issues.find(predicate) : undefined;
  if (!issue) throw new Error('The seeded file has no such issue');

  return issue;
}
