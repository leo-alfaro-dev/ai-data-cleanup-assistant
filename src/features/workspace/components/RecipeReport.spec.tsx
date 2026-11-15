import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RecipeResult } from '../state/recipeStore';
import { aiActions } from '../state/aiStore';
import { RecipeReport } from './RecipeReport';

const result: RecipeResult = {
  fileName: 'last.recipe.json',
  issues: [],
  skipped: [
    {
      rule: {
        kind: 'trimWhitespace',
        column: { header: 'city', occurrence: 1 },
      },
      index: 0,
      reason: 'missingColumn',
    },
    {
      index: 1,
      rule: { kind: 'dropDuplicateRows', mode: 'exact' },
      reason: 'nothingToChange',
    },
  ],
  cellsChanged: 12,
  rowsRemoved: 3,
};

describe('RecipeReport', () => {
  beforeEach(() => {
    aiActions.reset();
  });

  it('reports what the recipe did, and that no AI call was made', () => {
    render(<RecipeReport result={result} />);

    const report = screen.getByRole('region', { name: 'Recipe' });
    expect(report).toHaveTextContent('last.recipe.json');
    expect(report).toHaveTextContent('Rules applied0');
    expect(report).toHaveTextContent('Rules skipped2');
    expect(report).toHaveTextContent('Cells changed12');
    expect(report).toHaveTextContent('Rows removed3');
    expect(report).toHaveTextContent('0 AI calls');
  });

  it('says why each rule was skipped', () => {
    render(<RecipeReport result={result} />);

    expect(
      screen.getByText(/Extra spaces in “city”: The column is not in this file/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Exact duplicate rows: It finds nothing to change/)
    ).toBeInTheDocument();
  });
});
