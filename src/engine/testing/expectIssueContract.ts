import { expect } from 'vitest';
import { compileCleanPlan } from '@/engine/changes/compileCleanPlan';
import { listChangedCells } from '@/engine/changes/listChangedCells';
import type { Dataset } from '@/engine/dataset/dataset';
import type { Issue } from '@/engine/issues/issue';

/**
 * What every issue promises: a unique id, ascending valid rows, data that survives a clone,
 * and a suggestion that changes only cells and rows the issue lists.
 */
export function expectIssueContract({
  dataset,
  issues,
}: {
  dataset: Dataset;
  issues: readonly Issue[];
}): void {
  const ids = issues.map(({ id }) => id);
  expect(new Set(ids).size, 'issue ids are unique').toBe(ids.length);

  for (const issue of issues) {
    const { id, rows, column, suggestion } = issue;
    const ascending = [...new Set(rows)].sort(
      (first, second) => first - second
    );
    expect(rows, `${id} lists its rows once, ascending`).toEqual(ascending);
    expect(
      rows.every((rowId) => rowId >= 0 && rowId < dataset.rows.length),
      `${id} lists only rows that exist`
    ).toBe(true);
    if (column !== null) {
      expect(
        dataset.columns[column],
        `${id} names a column that exists`
      ).toBeDefined();
    }
    expect(structuredClone(issue), `${id} survives a structured clone`).toEqual(
      issue
    );

    if (suggestion === null) continue;

    const plan = compileCleanPlan({
      accepted: [{ issueId: id, change: suggestion }],
      dataset,
    });
    const listed = new Set(rows);
    const unlistedCells = [
      ...listChangedCells({ change: suggestion, plan, dataset }),
    ]
      .filter((cell) => !listed.has(cell.rowId))
      .map(({ rowId, column: changedColumn, before }) => ({
        rowId,
        changedColumn,
        before,
      }));
    const unlistedRemovals = [...plan.removedRows.keys()].filter(
      (rowId) => !listed.has(rowId)
    );

    expect(unlistedCells, `${id} changes cells it does not list`).toEqual([]);
    expect(unlistedRemovals, `${id} removes rows it does not list`).toEqual([]);
  }
}
