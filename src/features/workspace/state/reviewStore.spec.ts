import { CancelablePromise } from 'easy-cancelable-promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Change } from '@/engine/changes/change';
import type { ChangePreview } from '@/engine/changes/changePreview';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
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
