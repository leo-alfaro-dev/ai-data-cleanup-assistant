import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { workspaceActions } from '../state/workspaceStore';
import { FileDropzone } from './FileDropzone';

describe('FileDropzone', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads a file chosen with the picker', async () => {
    const loadFile = vi
      .spyOn(workspaceActions, 'loadFile')
      .mockResolvedValue(undefined);
    const file = new File(['name\nAda'], 'people.csv', { type: 'text/csv' });
    render(<FileDropzone />);

    await userEvent.upload(screen.getByLabelText('Choose a CSV file'), file);

    expect(loadFile).toHaveBeenCalledExactlyOnceWith(file);
  });

  it('loads the first file dropped on it', () => {
    const loadFile = vi
      .spyOn(workspaceActions, 'loadFile')
      .mockResolvedValue(undefined);
    const file = new File(['name\nAda'], 'people.csv', { type: 'text/csv' });
    render(<FileDropzone />);

    fireEvent.drop(screen.getByText(/Drop a CSV file here/), {
      dataTransfer: { files: [file] },
    });

    expect(loadFile).toHaveBeenCalledExactlyOnceWith(file);
  });

  it('can be reached from the keyboard', async () => {
    render(<FileDropzone />);

    await userEvent.tab();

    expect(screen.getByLabelText('Choose a CSV file')).toHaveFocus();
  });
});
