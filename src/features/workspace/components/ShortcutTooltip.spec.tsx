import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ShortcutTooltip } from './ShortcutTooltip';

describe('ShortcutTooltip', () => {
  it('names the key on its child and shows the action with its key on keyboard focus', async () => {
    const user = userEvent.setup();
    render(
      <ShortcutTooltip action="redo">
        <button type="button">Redo</button>
      </ShortcutTooltip>
    );
    const button = screen.getByRole('button', { name: 'Redo' });

    expect(button).toHaveAttribute('aria-keyshortcuts', 'Shift+u');

    await user.tab();

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Redo the stepShift U'
    );
    // The key is left out of the description: aria-keyshortcuts already announces it.
    expect(button).toHaveAccessibleDescription('Redo the step');
  });

  it('keeps its child but shows no tooltip and names no key without an action', async () => {
    const user = userEvent.setup();
    render(
      <ShortcutTooltip action={null}>
        <button type="button">Clear decision</button>
      </ShortcutTooltip>
    );
    const button = screen.getByRole('button', { name: 'Clear decision' });

    await user.tab();

    expect(button).toHaveFocus();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(button).not.toHaveAttribute('aria-keyshortcuts');
  });
});
