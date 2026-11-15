import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { accept } from '@/engine/testing/accept';
import { changed } from '@/engine/testing/changed';
import { cleanEveryCell } from '@/engine/testing/cleanEveryCell';
import { origin } from '@/engine/testing/origin';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import { deepFreeze } from '@/lib/deepFreeze';
import type { AcceptedChange } from './acceptedChange';
import type { Change } from './change';
import type { CleanPlan } from './cleanPlan';
import { compileCleanPlan } from './compileCleanPlan';

const NAME = toColumnKey(1);
const STATE = toColumnKey(2);
const JOINED = toColumnKey(3);

const customers = toDataset(
  'id,name,state,joined',
  '1,Ann,CA,2024/03/04',
  '2,Bob, Calif. ,"Mar 4, 2024"',
  '3,Cy,California,4 Mar 2024',
  '4,Di,TX,2024-03-04'
);

const ledger = toDataset('id,name', '1,a', '2,b', '3,c', '4,d', '5,e', '6,f');

describe('compileCleanPlan, removed rows', () => {
  it('keeps the smallest row id of each duplicate group, whatever order the group lists', () => {
    const plan = compileCleanPlan({
      dataset: ledger,
      accepted: [
        accept({
          issue: 'drop',
          change: {
            kind: 'dropDuplicateRows',
            mode: 'exact',
            groups: [
              [toRowId(2), toRowId(0), toRowId(1)],
              [toRowId(5), toRowId(3)],
            ],
          },
        }),
      ],
    });

    expect(removedRowIds(plan)).toEqual([1, 2, 5]);
    expect(plan.removedRows.get(toRowId(2))).toEqual(
      origin({ issue: 'drop', kind: 'dropDuplicateRows' })
    );
  });

  it('removes nothing from a group of one row or none', () => {
    const plan = compileCleanPlan({
      dataset: ledger,
      accepted: [
        accept({
          issue: 'drop',
          change: {
            kind: 'dropDuplicateRows',
            mode: 'normalized',
            groups: [[toRowId(3)], []],
          },
        }),
      ],
    });

    expect(removedRowIds(plan)).toEqual([]);
  });

  it('copes with a duplicate group larger than an argument list can spread', () => {
    const group = Array.from({ length: 200_000 }, (_, index) =>
      toRowId(index + 1)
    );

    const plan = compileCleanPlan({
      dataset: ledger,
      accepted: [
        accept({
          issue: 'drop',
          change: {
            kind: 'dropDuplicateRows',
            mode: 'exact',
            groups: [group],
          },
        }),
      ],
    });

    expect(plan.removedRows.size).toBe(199_999);
    expect(plan.removedRows.has(toRowId(0))).toBe(false);
    expect(plan.removedRows.has(toRowId(1))).toBe(false);
  });

  it('removes the rows a removal or a merge names, each remembering its change', () => {
    const plan = compileCleanPlan({
      dataset: ledger,
      accepted: [
        accept({
          issue: 'remove',
          change: { kind: 'removeRows', rows: [toRowId(0), toRowId(4)] },
        }),
        accept({
          issue: 'merge',
          change: {
            kind: 'mergeRows',
            keep: toRowId(1),
            remove: [toRowId(2)],
            values: [],
          },
        }),
      ],
    });

    expect(removedRowIds(plan)).toEqual([0, 2, 4]);
    expect(plan.removedRows.get(toRowId(4))).toEqual(
      origin({ issue: 'remove', kind: 'removeRows' })
    );
    expect(plan.removedRows.get(toRowId(2))).toEqual(
      origin({ issue: 'merge', kind: 'mergeRows' })
    );
  });

  it('keeps a removed row removed whatever else touches it', () => {
    const plan = compileCleanPlan({
      dataset: ledger,
      accepted: [
        accept({
          issue: 'a-remove',
          change: { kind: 'removeRows', rows: [toRowId(1)] },
        }),
        accept({
          issue: 'b-set',
          change: {
            kind: 'setCells',
            cells: [{ rowId: toRowId(1), column: toColumnKey(1), value: 'x' }],
          },
        }),
        accept({
          issue: 'c-merge-into',
          change: {
            kind: 'mergeRows',
            keep: toRowId(1),
            remove: [toRowId(3)],
            values: [{ column: toColumnKey(1), from: toRowId(3) }],
          },
        }),
        accept({
          issue: 'd-drop-keeping',
          change: {
            kind: 'dropDuplicateRows',
            mode: 'exact',
            groups: [[toRowId(1), toRowId(2)]],
          },
        }),
        accept({
          issue: 'e-trim',
          change: { kind: 'trimWhitespace', column: toColumnKey(1) },
        }),
      ],
    });

    expect(plan.removedRows.has(toRowId(1))).toBe(true);
    expect(plan.removedRows.get(toRowId(1))).toEqual(
      origin({ issue: 'a-remove', kind: 'removeRows' })
    );
  });
});

describe('compileCleanPlan, whatever the order of the decisions', () => {
  const set = ({ issue, value }: { issue: string; value: string }) =>
    accept({
      issue,
      change: {
        kind: 'setCells',
        cells: [{ rowId: toRowId(0), column: NAME, value }],
      },
    });

  const mergeName = ({
    issue,
    from,
    remove,
  }: {
    issue: string;
    from: number;
    remove: number;
  }) =>
    accept({
      issue,
      change: {
        kind: 'mergeRows',
        keep: toRowId(0),
        remove: [toRowId(remove)],
        values: [{ column: NAME, from: toRowId(from) }],
      },
    });

  const mapState = ({
    issue,
    canonical,
  }: {
    issue: string;
    canonical: string;
  }) =>
    accept({
      issue,
      change: {
        kind: 'mapValues',
        column: STATE,
        groups: [{ canonical, variants: ['CA'] }],
      },
    });

  const standardize = ({
    issue,
    format,
  }: {
    issue: string;
    format: 'YYYY-MM-DD' | 'D MMM YYYY';
  }) =>
    accept({
      issue,
      change: { kind: 'standardizeDates', column: JOINED, format },
    });

  it('gives two explicit values for one cell to the issue that sorts first', () => {
    const view = viewInBothOrders({
      dataset: customers,
      first: set({ issue: 'a', value: 'Alice' }),
      second: set({ issue: 'b', value: 'Alicia' }),
    });

    expect(view.cells[0]?.[NAME]).toEqual(
      changed({ value: 'Alice', issue: 'a', kind: 'setCells' })
    );
  });

  it('gives two merges filling one cell to the issue that sorts first, and removes the rows of both', () => {
    const view = viewInBothOrders({
      dataset: customers,
      first: mergeName({ issue: 'a', from: 1, remove: 1 }),
      second: mergeName({ issue: 'b', from: 3, remove: 3 }),
    });

    expect(view.cells[0]?.[NAME]).toEqual(
      changed({ value: 'Bob', issue: 'a', kind: 'mergeRows' })
    );
    expect(view.removed.map(([rowId]) => rowId)).toEqual([1, 3]);
  });

  it('gives one variant mapped to two canonical values to the issue that sorts first', () => {
    const view = viewInBothOrders({
      dataset: customers,
      first: mapState({ issue: 'a', canonical: 'California' }),
      second: mapState({ issue: 'b', canonical: 'Calif' }),
    });

    expect(view.cells[0]?.[STATE]).toEqual(
      changed({ value: 'California', issue: 'a', kind: 'mapValues' })
    );
  });

  it('gives two date formats on one column to the issue that sorts first', () => {
    const view = viewInBothOrders({
      dataset: customers,
      first: standardize({ issue: 'a', format: 'YYYY-MM-DD' }),
      second: standardize({ issue: 'b', format: 'D MMM YYYY' }),
    });

    expect(view.cells[0]?.[JOINED]).toEqual(
      changed({ value: '2024-03-04', issue: 'a', kind: 'standardizeDates' })
    );
  });

  it('gives a row removed twice to the issue that sorts first', () => {
    const view = viewInBothOrders({
      dataset: customers,
      first: accept({
        issue: 'b-remove',
        change: { kind: 'removeRows', rows: [toRowId(2)] },
      }),
      second: accept({
        issue: 'a-drop',
        change: {
          kind: 'dropDuplicateRows',
          mode: 'exact',
          groups: [[toRowId(1), toRowId(2)]],
        },
      }),
    });

    expect(view.removed).toEqual([
      [toRowId(2), origin({ issue: 'a-drop', kind: 'dropDuplicateRows' })],
    ]);
  });

  it('credits two trims of one column to the issue that sorts first', () => {
    const view = viewInBothOrders({
      dataset: customers,
      first: accept({
        issue: 'b',
        change: { kind: 'trimWhitespace', column: STATE },
      }),
      second: accept({
        issue: 'a',
        change: { kind: 'trimWhitespace', column: STATE },
      }),
    });

    expect(view.cells[1]?.[STATE]).toEqual(
      changed({ value: 'Calif.', issue: 'a', kind: 'trimWhitespace' })
    );
  });

  it('gives the same cleaned view for every ordering of a set of changes of every kind', () => {
    const accepted = [
      set({ issue: 'a', value: 'Alice' }),
      standardize({ issue: 'b', format: 'YYYY-MM-DD' }),
      mapState({ issue: 'c', canonical: 'California' }),
      mergeName({ issue: 'd', from: 3, remove: 3 }),
      accept({ issue: 'e', change: { kind: 'trimWhitespace', column: STATE } }),
    ];

    const [reference, ...others] = permutations(accepted).map((ordering) =>
      viewOf({ dataset: customers, accepted: ordering })
    );

    expect(others).toHaveLength(119);
    others.forEach((view) => expect(view).toEqual(reference));
  });

  it('reads original values, so merges never feed each other', () => {
    const dataset = toDataset(
      'name,state',
      'Ann,CA',
      'Ann,Calif.',
      'Ann,California'
    );

    const view = viewOf({
      dataset,
      accepted: [
        accept({
          issue: 'a',
          change: {
            kind: 'mergeRows',
            keep: toRowId(0),
            remove: [toRowId(1)],
            values: [{ column: toColumnKey(1), from: toRowId(1) }],
          },
        }),
        accept({
          issue: 'b',
          change: {
            kind: 'mergeRows',
            keep: toRowId(1),
            remove: [toRowId(2)],
            values: [{ column: toColumnKey(1), from: toRowId(2) }],
          },
        }),
      ],
    });

    expect(view.cells[0]?.[1]).toEqual(
      changed({ value: 'Calif.', issue: 'a', kind: 'mergeRows' })
    );
  });
});

describe('compileCleanPlan, cost', () => {
  it.each([
    { name: 'a trim', change: { kind: 'trimWhitespace', column: STATE } },
    {
      name: 'a mapping',
      change: {
        kind: 'mapValues',
        column: STATE,
        groups: [{ canonical: 'California', variants: ['CA'] }],
      },
    },
    {
      name: 'a date rule',
      change: {
        kind: 'standardizeDates',
        column: JOINED,
        format: 'YYYY-MM-DD',
      },
    },
    {
      name: 'a duplicate group',
      change: {
        kind: 'dropDuplicateRows',
        mode: 'exact',
        groups: [[toRowId(0), toRowId(1)]],
      },
    },
    {
      name: 'explicit values',
      change: {
        kind: 'setCells',
        cells: [{ rowId: toRowId(0), column: NAME, value: 'x' }],
      },
    },
    { name: 'a removal', change: { kind: 'removeRows', rows: [toRowId(2)] } },
  ] satisfies { name: string; change: Change }[])(
    'reads no row to compile $name',
    ({ change }) => {
      const { dataset, reads } = watchRowReads(customers);

      compileCleanPlan({
        dataset,
        accepted: [accept({ issue: 'change', change })],
      });

      expect(reads).toEqual([]);
    }
  );

  it('reads only the rows a merge takes values from', () => {
    const { dataset, reads } = watchRowReads(customers);

    compileCleanPlan({
      dataset,
      accepted: [
        accept({
          issue: 'merge',
          change: {
            kind: 'mergeRows',
            keep: toRowId(0),
            remove: [toRowId(1), toRowId(2)],
            values: [
              { column: NAME, from: toRowId(2) },
              { column: STATE, from: toRowId(2) },
              { column: JOINED, from: toRowId(0) },
            ],
          },
        }),
      ],
    });

    expect([...new Set(reads)]).toEqual(['2']);
  });
});

describe('compileCleanPlan, its input', () => {
  it('neither mutates nor reorders the accepted changes', () => {
    const accepted = deepFreeze([
      accept({ issue: 'b', change: { kind: 'trimWhitespace', column: STATE } }),
      accept({
        issue: 'a',
        change: { kind: 'removeRows', rows: [toRowId(0)] },
      }),
    ]);

    compileCleanPlan({ dataset: customers, accepted });

    expect(accepted.map(({ issueId }) => issueId)).toEqual(['b', 'a']);
  });

  it('never mutates the dataset', () => {
    const before = structuredClone(customers);

    compileCleanPlan({
      dataset: customers,
      accepted: [
        accept({
          issue: 'a',
          change: { kind: 'trimWhitespace', column: STATE },
        }),
        accept({
          issue: 'b',
          change: {
            kind: 'mergeRows',
            keep: toRowId(0),
            remove: [toRowId(1)],
            values: [{ column: NAME, from: toRowId(1) }],
          },
        }),
        accept({
          issue: 'c',
          change: { kind: 'removeRows', rows: [toRowId(3)] },
        }),
      ],
    });

    expect(customers).toEqual(before);
  });

  it('compiles no entries for an empty list', () => {
    const plan = compileCleanPlan({ dataset: customers, accepted: [] });

    expect(plan.removedRows.size).toBe(0);
    expect(plan.explicitCells.size).toBe(0);
    expect(plan.filledCells.size).toBe(0);
    expect(plan.columnRules.every((rules) => rules === null)).toBe(true);
  });
});

function removedRowIds(plan: CleanPlan): number[] {
  return [...plan.removedRows.keys()].sort((first, second) => first - second);
}

function viewOf({
  dataset,
  accepted,
}: {
  dataset: Dataset;
  accepted: readonly AcceptedChange[];
}) {
  const plan = compileCleanPlan({ dataset, accepted });

  return {
    cells: cleanEveryCell({ dataset, accepted }),
    removed: [...plan.removedRows].sort(([first], [second]) => first - second),
  };
}

function viewInBothOrders({
  dataset,
  first,
  second,
}: {
  dataset: Dataset;
  first: AcceptedChange;
  second: AcceptedChange;
}) {
  const forward = viewOf({ dataset, accepted: [first, second] });
  const backward = viewOf({ dataset, accepted: [second, first] });

  expect(backward).toEqual(forward);

  return forward;
}

function permutations<Item>(items: readonly Item[]): Item[][] {
  if (items.length <= 1) return [[...items]];

  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(
      (rest) => [item, ...rest]
    )
  );
}
