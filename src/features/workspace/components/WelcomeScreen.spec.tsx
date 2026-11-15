import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { recipeActions, recipeStore$ } from '../state/recipeStore';
import { workspaceActions } from '../state/workspaceStore';
import { WelcomeScreen } from './WelcomeScreen';

describe('WelcomeScreen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    recipeActions.reset();
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

  it('reads a recipe chosen with its own picker and says the next file will use it', async () => {
    const chooseRecipe = vi.spyOn(recipeActions, 'chooseRecipe');
    const recipe = new File(['{}'], 'last.recipe.json', {
      type: 'application/json',
    });
    render(<WelcomeScreen />);

    await userEvent.upload(
      screen.getByLabelText('Choose a recipe file'),
      recipe
    );

    expect(chooseRecipe).toHaveBeenCalledExactlyOnceWith(recipe);
  });

  it('shows the recipe that is waiting and why a rejected one was refused', () => {
    recipeStore$.setState({
      pending: {
        fileName: 'last.recipe.json',
        recipe: {
          version: 1,
          createdAt: 'x',
          source: { fileName: 'a.csv', rowCount: 1, columns: [] },
          rules: [{ kind: 'dropDuplicateRows', mode: 'exact' }],
        },
      },
      rejection: { fileName: 'bad.json', reason: 'notJson' },
      result: null,
      hasReplayFailed: false,
    });
    render(<WelcomeScreen />);

    expect(
      screen.getByText(/Recipe ready: last.recipe.json, 1 rule/)
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'bad.json: The file is not JSON, so it is not a recipe.'
    );
  });

  it('loads next month’s file with the sample recipe from one button', async () => {
    const load = vi
      .spyOn(workspaceActions, 'loadNextMonthSample')
      .mockResolvedValue(undefined);
    render(<WelcomeScreen />);

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Try the recipe on next month’s file',
      })
    );

    expect(load).toHaveBeenCalledOnce();
  });
});
