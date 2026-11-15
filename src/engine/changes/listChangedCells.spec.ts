import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { accept } from '@/engine/testing/accept';
import { toDataset } from '@/engine/testing/toDataset';
import type { AcceptedChange } from './acceptedChange';
import type { Change } from './change';
import type { ChangedCell } from './changedCell';
import { compileCleanPlan } from './compileCleanPlan';
import { listChangedCells } from './listChangedCells';

const NAME = toColumnKey(0);
const STATE = toColumnKey(1);
const JOINED = toColumnKey(2);

const people = toDataset(
  'name,state,joined',
  'Ann,CA,2024/03/04',
  'Bob, CA ,2024-03-04',
  'Cy,Calif.,03/04/2024',
  'Di,California,"Mar 4, 2024"'
);

describe('listChangedCells, rules on a column', () => {
  it('lists each cell a mapping changes, in file order, with its before and after', () => {
    const cells = listChanged({
      kind: 'mapValues',
      column: STATE,
      groups: [{ canonical: 'California', variants: ['CA', 'Calif.'] }],
    });

    expect(cells).toEqual([
      { rowId: 0, column: STATE, before: 'CA', after: 'California' },
      { rowId: 1, column: STATE, before: ' CA ', after: 'California' },
      { rowId: 2, column: STATE, before: 'Calif.', after: 'California' },
    ]);
  });

  it('skips cells the rule leaves as they are', () => {
    const cells = listChanged({ kind: 'trimWhitespace', column: STATE });

    expect(cells).toEqual([
      { rowId: 1, column: STATE, before: ' CA ', after: 'CA' },
    ]);
  });

  it('skips cells it cannot read with one certain meaning', () => {
    const cells = listChanged({
      kind: 'standardizeDates',
      column: JOINED,
      format: 'YYYY-MM-DD',
    });

    expect(cells.map(({ rowId, after }) => [rowId, after])).toEqual([
      [0, '2024-03-04'],
      [3, '2024-03-04'],
    ]);
  });

  it('skips rows the plan removes', () => {
    const change: Change = { kind: 'trimWhitespace', column: STATE };
    const plan = compileCleanPlan({
      dataset: people,
      accepted: [
        accept({ issue: 'trim', change }),
        accept({
          issue: 'remove',
          change: { kind: 'removeRows', rows: [toRowId(1)] },
        }),
      ],
    });

    expect([...listChangedCells({ change, plan, dataset: people })]).toEqual(
      []
    );
  });
});

describe('listChangedCells, cells named by the change', () => {
  it('lists the cells a set changes in file order, whatever order the change lists them, and skips values equal to the original', () => {
    const cells = listChanged({
      kind: 'setCells',
      cells: [
        { rowId: toRowId(3), column: NAME, value: 'Dee' },
        { rowId: toRowId(0), column: STATE, value: 'California' },
        { rowId: toRowId(2), column: NAME, value: 'Cy' },
        { rowId: toRowId(0), column: NAME, value: 'Alice' },
      ],
    });

    expect(cells).toEqual([
      { rowId: 0, column: NAME, before: 'Ann', after: 'Alice' },
      { rowId: 0, column: STATE, before: 'CA', after: 'California' },
      { rowId: 3, column: NAME, before: 'Di', after: 'Dee' },
    ]);
  });

  it('lists the cells a merge fills in the kept row, and not the cells of the rows it removes', () => {
    const cells = listChanged({
      kind: 'mergeRows',
      keep: toRowId(0),
      remove: [toRowId(1)],
      values: [
        { column: NAME, from: toRowId(1) },
        { column: STATE, from: toRowId(0) },
      ],
    });

    expect(cells).toEqual([
      { rowId: 0, column: NAME, before: 'Ann', after: 'Bob' },
    ]);
  });

  it.each([
    {
      name: 'a duplicate group',
      change: {
        kind: 'dropDuplicateRows',
        mode: 'exact',
        groups: [[toRowId(0), toRowId(1)]],
      },
    },
    { name: 'a removal', change: { kind: 'removeRows', rows: [toRowId(2)] } },
  ] satisfies { name: string; change: Change }[])(
    'lists no cell for $name',
    ({ change }) => {
      expect(listChanged(change)).toEqual([]);
    }
  );
});

function listChanged(change: Change): ChangedCell[] {
  const accepted: AcceptedChange[] = [accept({ issue: 'issue', change })];
  const plan = compileCleanPlan({ accepted, dataset: people });

  return [...listChangedCells({ change, plan, dataset: people })];
}
