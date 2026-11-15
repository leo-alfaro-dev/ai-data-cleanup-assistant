import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('shows its title, description and content while open', () => {
    render(
      <Modal
        isOpen
        title="Export"
        description="Download the files."
        onClose={vi.fn()}
      >
        <p>Body</p>
      </Modal>
    );

    expect(screen.getByRole('dialog', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByText('Download the files.')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('renders nothing while closed', () => {
    render(
      <Modal isOpen={false} title="Export" description="x" onClose={vi.fn()}>
        <p>Body</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape and on the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen title="Export" description="x" onClose={onClose}>
        <p>Body</p>
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('cannot be dismissed while closing is disabled', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal
        isOpen
        isCloseDisabled
        title="Export"
        description="x"
        onClose={onClose}
      >
        <p>Body</p>
      </Modal>
    );

    await user.keyboard('{Escape}');
    fireEvent.pointerDown(document.body);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
  });
});
