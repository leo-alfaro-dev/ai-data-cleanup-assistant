import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Change, MapValues } from '@/engine/changes/change';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toIssueId } from '@/engine/issues/toIssueId';
import { SHORTCUTS } from '../shortcuts';
import { helpActions } from '../state/helpStore';
import { reviewActions, reviewStore$ } from '../state/reviewStore';
import { makeIssue } from '../testing/makeIssue';
import { mockLayout } from '../testing/mockLayout';
import { seedIssues } from '../testing/seedIssues';
import { DecisionAnnouncement } from './DecisionAnnouncement';
import { ReviewWorkspace } from './ReviewWorkspace';
import { ShortcutHelp } from './ShortcutHelp';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

mockLayout();

const trim: Change = { kind: 'trimWhitespace', column: toColumnKey(0) };
const mapping: MapValues = {
  kind: 'mapValues',
  column: toColumnKey(0),
  groups: [{ canonical: 'Paris', variants: ['paris', 'PARIS'] }],
};
const decisionOf = (id: string) =>
  reviewStore$.getState().decisions.get(toIssueId(id));

function renderReview() {
  return render(
    <>
      <ReviewWorkspace />
      <ShortcutHelp />
      <input aria-label="Notes" />
    </>
  );
}

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

describe('reviewing from the keyboard', () => {
  beforeEach(() => {
    helpActions.close();
    seedIssues({
      lines: ['name', 'Ada', 'Bo'],
      issues: [
        makeIssue({ id: 'first', confidence: 'certain', suggestion: trim }),
        makeIssue({ id: 'second', confidence: 'high', suggestion: trim }),
        makeIssue({ id: 'third', confidence: 'medium', suggestion: trim }),
      ],
    });
  });

  it('moves with J and K, accepts with A, rejects with R and undoes with U', async () => {
    const user = userEvent.setup();
    renderReview();

    await user.keyboard('j');
    expect(reviewStore$.getState().selectedIssueId).toBe('first');
    await user.keyboard('a');
    await user.keyboard('j');
    expect(reviewStore$.getState().selectedIssueId).toBe('second');
    await user.keyboard('r');

    expect(decisionOf('first')).toEqual({ status: 'accepted' });
    expect(decisionOf('second')).toEqual({ status: 'rejected' });

    await user.keyboard('u');
    expect(decisionOf('second')).toBeUndefined();
    await user.keyboard('{Shift>}u{/Shift}');
    expect(decisionOf('second')).toEqual({ status: 'rejected' });

    await user.keyboard('k');
    expect(reviewStore$.getState().selectedIssueId).toBe('first');
  });

  it('stays on the first and last issue instead of wrapping', async () => {
    const user = userEvent.setup();
    renderReview();

    await user.keyboard('jjjjj');
    expect(reviewStore$.getState().selectedIssueId).toBe('third');
    await user.keyboard('kkkk');

    expect(reviewStore$.getState().selectedIssueId).toBe('first');
  });

  it('switches the grid view with O', async () => {
    const user = userEvent.setup();
    renderReview();

    await user.keyboard('o');
    expect(reviewStore$.getState().view).toBe('original');
    await user.keyboard('o');

    expect(reviewStore$.getState().view).toBe('cleaned');
  });

  it('does nothing with a key while the user types in a field', async () => {
    const user = userEvent.setup();
    renderReview();
    await user.keyboard('j');
    await nextFrame();

    await user.click(screen.getByLabelText('Notes'));
    await user.keyboard('aru');

    expect(reviewStore$.getState().decisions.size).toBe(0);
    expect(screen.getByLabelText('Notes')).toHaveValue('aru');
  });

  it('ignores a key pressed with Control or Command', async () => {
    const user = userEvent.setup();
    renderReview();
    await user.keyboard('j');

    await user.keyboard('{Control>}a{/Control}');

    expect(reviewStore$.getState().decisions.size).toBe(0);
  });

  it('opens the help with ? and lists every shortcut of the list', async () => {
    const user = userEvent.setup();
    renderReview();

    await user.keyboard('?');

    const dialog = await screen.findByRole('dialog', {
      name: 'Keyboard shortcuts',
    });
    for (const { label, display } of SHORTCUTS) {
      expect(dialog).toHaveTextContent(label);
      expect(dialog).toHaveTextContent(display);
    }
  });

  it('does not act on keys pressed inside the help dialog', async () => {
    const user = userEvent.setup();
    renderReview();
    await user.keyboard('j');
    await user.keyboard('?');
    await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });

    await user.keyboard('a');

    expect(decisionOf('first')).toBeUndefined();
  });

  it('treats an upper-case letter without Shift, as Caps Lock sends it, as the plain key', async () => {
    const user = userEvent.setup();
    renderReview();
    await user.keyboard('ja');

    fireEvent.keyDown(document.body, { key: 'U', shiftKey: false });

    expect(decisionOf('first')).toBeUndefined();
  });

  it('ignores a key that is held down, except for moving between issues', async () => {
    const user = userEvent.setup();
    renderReview();
    await user.keyboard('ja');
    await user.keyboard('j');
    await user.keyboard('r');

    fireEvent.keyDown(document.body, { key: 'u', repeat: true });
    expect(decisionOf('second')).toEqual({ status: 'rejected' });
    fireEvent.keyDown(document.body, { key: 'k', repeat: true });

    expect(reviewStore$.getState().selectedIssueId).toBe('first');
  });

  it('opens the editor with E, keeps the other keys out of it, and closes it with Escape', async () => {
    const user = userEvent.setup();
    seedIssues({
      lines: ['city', 'paris', 'PARIS'],
      issues: [
        makeIssue({ id: 'map', suggestion: mapping }),
        makeIssue({ id: 'other', suggestion: trim }),
      ],
    });
    renderReview();
    reviewActions.select(toIssueId('map'));

    await user.keyboard('e');
    expect(reviewStore$.getState().editingIssueId).toBe('map');
    await nextFrame();
    await user.keyboard('jar');
    expect(reviewStore$.getState().selectedIssueId).toBe('map');
    expect(reviewStore$.getState().decisions.size).toBe(0);

    await user.keyboard('{Escape}');

    expect(reviewStore$.getState().editingIssueId).toBeNull();
    expect(reviewStore$.getState().decisions.size).toBe(0);
  });

  it('keeps an edit when A is pressed on the edited issue', async () => {
    const user = userEvent.setup();
    seedIssues({
      lines: ['city', 'paris', 'PARIS'],
      issues: [makeIssue({ id: 'map', suggestion: mapping })],
    });
    renderReview();
    await user.keyboard('j');
    const edited: Change = {
      ...mapping,
      groups: [{ canonical: 'Paris City', variants: ['paris'] }],
    };
    reviewActions.edit({ issueId: toIssueId('map'), change: edited });

    await user.keyboard('a');

    expect(decisionOf('map')).toEqual({ status: 'edited', change: edited });
  });

  it('shows the key on the buttons it works for', async () => {
    renderReview();

    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(
      screen.getAllByRole('button', { name: 'Trim spaces' })[0]
    ).toHaveAttribute('aria-keyshortcuts', 'a');
  });
});

describe('DecisionAnnouncement', () => {
  beforeEach(() => {
    seedIssues({
      lines: ['name', 'Ada'],
      issues: [
        makeIssue({ id: 'first', suggestion: trim }),
        makeIssue({ id: 'second', suggestion: trim }),
      ],
    });
  });

  it('announces a decision, a bulk decision and an undo', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ReviewWorkspace />
        <DecisionAnnouncement data-testid="announcement" />
      </>
    );
    const announcement = screen.getAllByTestId('announcement')[0];

    await user.keyboard('ja');
    expect(announcement).toHaveTextContent('Applied: Blank rows.');

    await user.keyboard('u');
    expect(announcement).toHaveTextContent(
      'Undid 1 decision. 0 steps can be undone.'
    );
  });
});
