import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analysisStore$ } from './state/analysisStore';
import { workspaceActions, workspaceStore$ } from './state/workspaceStore';
import { mockLayout } from './testing/mockLayout';
import { seedWorkspace } from './testing/seedWorkspace';
import { WorkspacePage } from './WorkspacePage';

vi.mock('@/workers/getDatasetWorker', async () => {
  const { idleWorkerModule } = await import('./testing/idleWorkerModule');

  return idleWorkerModule;
});

mockLayout();

describe('WorkspacePage', () => {
  beforeEach(() => {
    workspaceActions.reset();
  });

  it('names the app and offers a file to load before one is loaded', () => {
    render(<WorkspacePage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'AI Data Cleanup Assistant',
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Choose a CSV file')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Export' })
    ).not.toBeInTheDocument();
  });

  it('shows the loaded file, the issues and the grid once the file is ready', () => {
    seedWorkspace('name,city', ' Ada ,Paris', 'Bo,Rome');

    render(<WorkspacePage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'AI Data Cleanup Assistant',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Loaded file' })
    ).toHaveTextContent('2 rows × 2 columns · Comma-separated');
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
    expect(screen.getByRole('table', { name: 'Data' })).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Filter issues by category' })
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Choose a CSV file')
    ).not.toBeInTheDocument();
  });

  it('keeps a live region in the workspace that announces the finished checks', () => {
    seedWorkspace('name', 'Ada');

    const { container } = render(<WorkspacePage />);

    expect(container.querySelector('p[aria-live="polite"]')).toHaveTextContent(
      /^Checks finished\. \d+ issues? found\.$/
    );
  });

  it('goes back to the file picker on Load another file', async () => {
    const user = userEvent.setup();
    seedWorkspace('name', 'Ada');
    render(<WorkspacePage />);

    await user.click(screen.getByRole('button', { name: 'Load another file' }));

    expect(
      await screen.findByLabelText('Choose a CSV file')
    ).toBeInTheDocument();
    expect(workspaceStore$.getState().phase.status).toBe('empty');
    expect(
      screen.queryByRole('table', { name: 'Data' })
    ).not.toBeInTheDocument();
  });

  it('goes back to the start on the wordmark', async () => {
    const user = userEvent.setup();
    seedWorkspace('name', 'Ada');
    render(<WorkspacePage />);

    await user.click(
      screen.getByRole('button', { name: 'AI Data Cleanup Assistant' })
    );

    expect(
      await screen.findByLabelText('Choose a CSV file')
    ).toBeInTheDocument();
    expect(workspaceStore$.getState().phase.status).toBe('empty');
  });

  it('keeps Export off until the checks have finished or failed', () => {
    seedWorkspace('name', 'Ada');
    analysisStore$.setState({
      phase: { status: 'running', stage: 'checking', percentage: 40 },
    });
    const { rerender } = render(<WorkspacePage />);
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Export' })
    ).toHaveAccessibleDescription(
      'Export is available when the checks finish.'
    );

    act(() => analysisStore$.setState({ phase: { status: 'failed' } }));
    rerender(<WorkspacePage />);

    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
  });

  it('opens the export dialog from the Export button', async () => {
    const user = userEvent.setup();
    seedWorkspace('name', 'Ada');
    render(<WorkspacePage />);

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(
      await screen.findByRole('dialog', { name: 'Export' })
    ).toBeInTheDocument();
  });
});
