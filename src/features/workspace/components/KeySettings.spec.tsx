import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { aiFailureCopy } from '../aiFailureCopy';
import { aiActions, aiStore$ } from '../state/aiStore';
import { settingsActions, settingsStore$ } from '../state/settingsStore';
import { KeySettings } from './KeySettings';

async function openPopover() {
  const user = userEvent.setup();
  render(<KeySettings />);
  await user.click(screen.getByRole('button', { name: /your key/i }));

  return user;
}

describe('KeySettings', () => {
  beforeEach(() => {
    aiActions.reset();
    settingsActions.removeOwnKey();
  });

  it('keeps the key in a password field, says it stays in the tab, and can reveal it', async () => {
    const user = await openPopover();

    const input = screen.getByLabelText('OpenRouter key');
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByText(/stays in this tab/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show the key' }));

    expect(input).toHaveAttribute('type', 'text');
  });

  it('saves the pasted key and closes', async () => {
    const user = await openPopover();
    expect(screen.getByRole('button', { name: 'Use this key' })).toBeDisabled();

    await user.type(screen.getByLabelText('OpenRouter key'), 'sk-or-visitor');
    await user.click(screen.getByRole('button', { name: 'Use this key' }));

    expect(settingsStore$.getState().ownKey).toBe('sk-or-visitor');
    expect(
      screen.queryByRole('dialog', { name: 'Own key settings' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Your key' })).toHaveFocus();
  });

  it('opens again with an empty field and offers to remove the saved key', async () => {
    const user = await openPopover();
    await user.type(screen.getByLabelText('OpenRouter key'), 'sk-or-visitor');
    await user.click(screen.getByRole('button', { name: 'Use this key' }));

    await user.click(screen.getByRole('button', { name: 'Your key' }));

    expect(screen.getByLabelText('OpenRouter key')).toHaveValue('');
    expect(
      screen.getByRole('button', { name: 'Remove key' })
    ).toBeInTheDocument();
  });

  it('removes the key', async () => {
    settingsActions.saveOwnKey('sk-or-visitor');
    const user = await openPopover();

    await user.click(screen.getByRole('button', { name: 'Remove key' }));

    expect(settingsStore$.getState().ownKey).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Remove key' })
    ).not.toBeInTheDocument();
  });

  it('shows that the key was rejected inside the popover when a request failed with invalidKey', async () => {
    settingsActions.saveOwnKey('sk-or-wrong');
    aiStore$.setState((state) => ({
      ...state,
      rejectedKeyRevision: settingsStore$.getState().ownKeyRevision,
    }));

    await openPopover();

    expect(screen.getByRole('alert')).toHaveTextContent(
      aiFailureCopy.invalidKey
    );
  });

  it('stops saying the key was rejected once another key is saved', async () => {
    settingsActions.saveOwnKey('sk-or-wrong');
    aiStore$.setState((state) => ({
      ...state,
      rejectedKeyRevision: settingsStore$.getState().ownKeyRevision,
    }));
    const user = await openPopover();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.type(screen.getByLabelText('OpenRouter key'), 'sk-or-new');
    await user.click(screen.getByRole('button', { name: 'Use this key' }));
    await user.click(screen.getByRole('button', { name: 'Your key' }));

    expect(screen.getByLabelText('OpenRouter key')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows no rejection while no request has failed on the key', async () => {
    settingsActions.saveOwnKey('sk-or-fine');

    await openPopover();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
