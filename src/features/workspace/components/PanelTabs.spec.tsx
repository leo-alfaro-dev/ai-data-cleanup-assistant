import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reviewStore$ } from '../state/reviewStore';
import { seedWorkspace } from '../testing/seedWorkspace';
import { PanelTabs } from './PanelTabs';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('../testing/idleWorkerModule');

  return idleWorkerModule;
});

describe('PanelTabs', () => {
  beforeEach(() => {
    seedWorkspace('name', ' Ada', 'Bo');
  });

  it('offers Issues and Data, with the number of issues, and starts on Issues', () => {
    render(<PanelTabs />);

    const issues = screen.getByRole('tab', { name: /^Issues \d+$/ });
    expect(issues).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Data' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('switches panel on a click and back', async () => {
    const user = userEvent.setup();
    render(<PanelTabs />);

    await user.click(screen.getByRole('tab', { name: 'Data' }));

    expect(reviewStore$.getState().panel).toBe('data');
    expect(screen.getByRole('tab', { name: 'Data' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await user.click(screen.getByRole('tab', { name: /^Issues/ }));

    expect(reviewStore$.getState().panel).toBe('issues');
  });

  it('moves between the tabs with the arrow keys and focuses the one it moves to', async () => {
    const user = userEvent.setup();
    render(<PanelTabs />);
    screen.getByRole('tab', { name: /^Issues/ }).focus();

    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Data' })).toHaveFocus();
    expect(reviewStore$.getState().panel).toBe('data');

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /^Issues/ })).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Data' })).toHaveFocus();
  });

  it('leaves only the selected tab in the tab order', () => {
    render(<PanelTabs />);

    expect(screen.getByRole('tab', { name: /^Issues/ })).toHaveAttribute(
      'tabindex',
      '0'
    );
    expect(screen.getByRole('tab', { name: 'Data' })).toHaveAttribute(
      'tabindex',
      '-1'
    );
  });
});
