import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes its value and label to assistive technology', () => {
    render(<ProgressBar value={42} label="Parsing rows" />);

    const progressBar = screen.getByRole('progressbar', {
      name: 'Parsing rows',
    });

    expect(progressBar).toHaveAttribute('aria-valuenow', '42');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('rounds its value and keeps it between 0 and 100', () => {
    const { rerender } = render(<ProgressBar value={41.6} label="Reading" />);
    const progressBar = screen.getByRole('progressbar', { name: 'Reading' });

    expect(progressBar).toHaveAttribute('aria-valuenow', '42');

    rerender(<ProgressBar value={130} label="Reading" />);

    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });
});
