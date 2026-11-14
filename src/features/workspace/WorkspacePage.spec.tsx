import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkspacePage } from './WorkspacePage';

describe('WorkspacePage', () => {
  it('names the app', () => {
    render(<WorkspacePage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'AI Data Cleanup Assistant',
      })
    ).toBeInTheDocument();
  });
});
