import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Change } from '@/engine/changes/change';
import type { Dataset } from '@/engine/dataset/dataset';
import { toIssueId } from '@/engine/issues/toIssueId';
import { reviewActions, reviewStore$ } from '../state/reviewStore';
import { readIssue } from '../state/readIssue';
import { mockLayout } from '../testing/mockLayout';
import { seedWorkspace } from '../testing/seedWorkspace';
import { IssueDetail } from './IssueDetail';

const { holder } = vi.hoisted(() => ({
  holder: { dataset: null as Dataset | null },
}));

vi.mock('@/workers/getDatasetWorker', async () => {
  const { CancelablePromise } = await import('easy-cancelable-promise');
  const { previewChange } = await import('@/engine/changes/previewChange');

  return {
    getDatasetWorker: () => ({
      preview: (change: Change) =>
        CancelablePromise.resolve(
          holder.dataset
            ? previewChange({ change, dataset: holder.dataset })
            : null
        ),
    }),
  };
});

mockLayout({ height: 300 });

const casing = toIssueId('casing-variants:1');

function openEditor() {
  const issue = readIssue({
    issueId: casing,
    decisions: reviewStore$.getState().decisions,
  });
  if (!issue) throw new Error('The seeded file has no casing issue');
  reviewActions.select(issue.id);
  render(<IssueDetail issue={issue} />);

  return userEvent.setup();
}

describe('IssueEditor on a value mapping', () => {
  beforeEach(() => {
    holder.dataset = seedWorkspace(
      'name,city',
      'Ada,Paris',
      'Bo,paris',
      'Cy,PARIS',
      'Di,Paris',
      'Ed,Rome',
      'Flo,Rome',
      'Gus,Rome',
      'Hal,Oslo',
      'Ivy,Oslo',
      'Jo,Oslo'
    );
  });

  it('shows fresh counts as a variant is taken out, before anything is accepted', async () => {
    const user = openEditor();
    await user.click(screen.getByRole('button', { name: /^Edit/ }));
    const before = await screen.findAllByText(/^Changes \d+ cells? in/);
    expect(before.length).toBeGreaterThan(0);
    const original = before[0]?.textContent ?? '';

    await user.click(screen.getByRole('checkbox', { name: 'PARIS' }));

    expect(
      await screen.findByText(
        (text) => /^Changes \d+ cells? in/.test(text) && text !== original
      )
    ).toBeInTheDocument();
    expect(reviewStore$.getState().decisions.size).toBe(0);
  });

  it('saves a typed canonical value as an edited decision', async () => {
    const user = openEditor();
    await user.click(screen.getByRole('button', { name: /^Edit/ }));
    const input = await screen.findByRole('textbox', {
      name: /Common spelling for/,
    });

    await user.clear(input);
    await user.type(input, 'Paris City');
    await screen.findAllByText(/^Changes \d+ cells? in/);
    await user.click(screen.getByRole('button', { name: 'Save and accept' }));

    const decision = reviewStore$.getState().decisions.get(casing);
    expect(decision).toMatchObject({
      status: 'edited',
      change: { kind: 'mapValues', groups: [{ canonical: 'Paris City' }] },
    });
    expect(reviewStore$.getState().editingIssueId).toBeNull();
  });

  it('restores the suggestion on Reset to suggestion', async () => {
    const user = openEditor();
    await user.click(screen.getByRole('button', { name: /^Edit/ }));
    const input = await screen.findByRole('textbox', {
      name: /Common spelling for/,
    });
    const suggested = (input as HTMLInputElement).value;

    await user.clear(input);
    await user.type(input, 'Elsewhere');
    await user.click(
      screen.getByRole('button', { name: 'Reset to suggestion' })
    );

    expect(
      screen.getByRole('textbox', { name: /Common spelling for/ })
    ).toHaveValue(suggested);
  });

  it('leaves the issue undecided on Cancel', async () => {
    const user = openEditor();
    await user.click(screen.getByRole('button', { name: /^Edit/ }));

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(reviewStore$.getState().decisions.size).toBe(0);
    expect(reviewStore$.getState().editingIssueId).toBeNull();
  });

  it('does not offer to save while no variant is left to change', async () => {
    const user = openEditor();
    await user.click(screen.getByRole('button', { name: /^Edit/ }));
    await screen.findAllByText(/^Changes \d+ cells? in/);

    for (const box of screen.getAllByRole('checkbox')) await user.click(box);

    expect(
      screen.getByRole('button', { name: 'Save and accept' })
    ).toBeDisabled();
  });
});
