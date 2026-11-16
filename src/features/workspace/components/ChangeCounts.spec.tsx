import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChangeCounts } from './ChangeCounts';

describe('ChangeCounts', () => {
  it('counts the cells, the rows and the rows removed', () => {
    render(<ChangeCounts counts={{ cells: 12, rows: 10, removedRows: 3 }} />);

    expect(
      screen.getByText('Changes 12 cells in 10 rows. Removes 3 rows.')
    ).toBeInTheDocument();
  });

  it('says only how many rows go when no cell changes', () => {
    render(<ChangeCounts counts={{ cells: 0, rows: 0, removedRows: 70 }} />);

    expect(screen.getByText('Removes 70 rows.')).toBeInTheDocument();
  });

  it('says nothing of removed rows when there are none', () => {
    render(<ChangeCounts counts={{ cells: 1, rows: 1, removedRows: 0 }} />);

    expect(screen.getByText('Changes 1 cell in 1 row.')).toBeInTheDocument();
  });
});
