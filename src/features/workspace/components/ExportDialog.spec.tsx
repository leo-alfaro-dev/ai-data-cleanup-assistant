import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CancelablePromise, defer } from 'easy-cancelable-promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import type { CleanedFiles } from '@/engine/export/cleanedFiles';
import { toIssueId } from '@/engine/issues/toIssueId';
import { downloadFile } from '../downloadFile';
import { analysisStore$ } from '../state/analysisStore';
import { exportActions, exportStore$ } from '../state/exportStore';
import { reviewActions } from '../state/reviewStore';
import { seedWorkspace } from '../testing/seedWorkspace';
import { ExportDialog } from './ExportDialog';

const { worker } = vi.hoisted(() => ({
  worker: {
    exportFiles:
      vi.fn<
        (accepted: AcceptedChange[]) => CancelablePromise<CleanedFiles | null>
      >(),
    preview: vi.fn(),
  },
}));

vi.mock('@/workers/getDatasetWorker', () => ({
  getDatasetWorker: () => worker,
}));
vi.mock('../downloadFile', () => ({ downloadFile: vi.fn() }));

const files: CleanedFiles = {
  csv: 'name\nAda\n',
  changeLog: 'row,column\n',
  cellsChanged: 12,
  rowsRemoved: 3,
};

describe('ExportDialog', () => {
  beforeEach(() => {
    vi.mocked(downloadFile).mockReset();
    worker.exportFiles.mockReset();
    worker.preview.mockReset();
    worker.preview.mockReturnValue(CancelablePromise.resolve(null));
    seedWorkspace('name', ' Ada', 'Bo', 'Bo');
  });

  it('is not shown until an export is opened', () => {
    render(<ExportDialog />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cannot be dismissed while the export runs, and no control in it is enabled', async () => {
    const user = userEvent.setup();
    const held = defer<CleanedFiles | null>();
    worker.exportFiles.mockReturnValue(held.promise);
    render(<ExportDialog />);

    const opening = exportActions.open();

    expect(
      await screen.findByRole('dialog', { name: 'Export' })
    ).toBeInTheDocument();
    expect(screen.getByText('Preparing the files.')).toBeInTheDocument();
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }

    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(exportStore$.getState().phase.status).toBe('running');

    held.resolve(files);
    await opening;

    expect(await screen.findByText('12 cells')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Download cleaned CSV' })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Download change log' })
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
  });

  it('shows the cells changed, the rows removed and the issues still pending', async () => {
    worker.exportFiles.mockReturnValue(CancelablePromise.resolve(files));
    reviewActions.accept(toIssueId('whitespace:0'));
    render(<ExportDialog />);

    await exportActions.open();

    expect(await screen.findByText('12 cells')).toBeInTheDocument();
    expect(screen.getByText('3 rows')).toBeInTheDocument();
    expect(screen.getByText('1 issue')).toBeInTheDocument();
    expect(
      screen.getByText('Pending issues leave the data as it is in the file.')
    ).toBeInTheDocument();
  });

  it('does not mention pending issues when every issue is decided', async () => {
    worker.exportFiles.mockReturnValue(CancelablePromise.resolve(files));
    reviewActions.accept(toIssueId('whitespace:0'));
    reviewActions.accept(toIssueId('exact-duplicates'));
    render(<ExportDialog />);

    await exportActions.open();

    expect(await screen.findByText('0 issues')).toBeInTheDocument();
    expect(
      screen.queryByText('Pending issues leave the data as it is in the file.')
    ).not.toBeInTheDocument();
  });

  it('says the issues were not checked when the checks did not finish', async () => {
    worker.exportFiles.mockReturnValue(CancelablePromise.resolve(files));
    analysisStore$.setState({ phase: { status: 'failed' } });
    render(<ExportDialog />);

    await exportActions.open();

    expect(await screen.findByText('Not checked')).toBeInTheDocument();
    expect(
      screen.queryByText('Pending issues leave the data as it is in the file.')
    ).not.toBeInTheDocument();
  });

  it('downloads the cleaned file and the change log under the names derived from the loaded file', async () => {
    const user = userEvent.setup();
    worker.exportFiles.mockReturnValue(CancelablePromise.resolve(files));
    render(<ExportDialog />);
    await exportActions.open();

    await user.click(
      await screen.findByRole('button', { name: 'Download cleaned CSV' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Download change log' })
    );

    expect(downloadFile).toHaveBeenNthCalledWith(1, {
      name: 'people.cleaned.csv',
      text: files.csv,
    });
    expect(downloadFile).toHaveBeenNthCalledWith(2, {
      name: 'people.changes.csv',
      text: files.changeLog,
    });
  });

  it('closes from its Close button once the files are ready', async () => {
    const user = userEvent.setup();
    worker.exportFiles.mockReturnValue(CancelablePromise.resolve(files));
    render(<ExportDialog />);
    await exportActions.open();

    await user.click(await screen.findByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says the files could not be prepared, with no downloads', async () => {
    worker.exportFiles.mockReturnValue(
      CancelablePromise.reject(new Error('x'))
    );
    render(<ExportDialog />);

    await exportActions.open();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The files could not be prepared'
    );
    expect(
      screen.getByRole('button', { name: 'Download cleaned CSV' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
  });
});
