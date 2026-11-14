import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('fires when enabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Export</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Export
      </Button>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not submit a form unless asked to', () => {
    render(<Button>Export</Button>);

    expect(screen.getByRole('button', { name: 'Export' })).toHaveAttribute(
      'type',
      'button'
    );
  });
});
