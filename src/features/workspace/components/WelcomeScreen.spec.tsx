import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { workspaceActions } from '../state/workspaceStore';
import { WelcomeScreen } from './WelcomeScreen';

describe('WelcomeScreen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers the sample as the primary action and describes it', async () => {
    const loadSample = vi
      .spyOn(workspaceActions, 'loadSample')
      .mockResolvedValue(undefined);
    render(<WelcomeScreen />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Load sample data' })
    );

    expect(loadSample).toHaveBeenCalledOnce();
    expect(
      screen.getByText(/1,150 synthetic customer rows with planted errors/)
    ).toBeInTheDocument();
  });

  it('states the three facts about the data', () => {
    render(<WelcomeScreen />);

    const facts = screen.getByRole('list', {
      name: 'How your data is handled',
    });
    expect(facts).toHaveTextContent('The file stays in the browser');
    expect(facts).toHaveTextContent('The AI gets summaries');
    expect(facts).toHaveTextContent('Nothing changes without you');
  });

  it('loads a file chosen with the picker', async () => {
    const loadFile = vi
      .spyOn(workspaceActions, 'loadFile')
      .mockResolvedValue(undefined);
    const file = new File(['name\nAda'], 'people.csv', { type: 'text/csv' });
    render(<WelcomeScreen />);

    await userEvent.upload(screen.getByLabelText('Choose a CSV file'), file);

    expect(loadFile).toHaveBeenCalledExactlyOnceWith(file);
  });

  it('loads the first file dropped anywhere on it', () => {
    const loadFile = vi
      .spyOn(workspaceActions, 'loadFile')
      .mockResolvedValue(undefined);
    const file = new File(['name\nAda'], 'people.csv', { type: 'text/csv' });
    render(<WelcomeScreen />);

    fireEvent.drop(
      screen.getByRole('list', { name: 'How your data is handled' }),
      {
        dataTransfer: { files: [file] },
      }
    );

    expect(loadFile).toHaveBeenCalledExactlyOnceWith(file);
  });
});
