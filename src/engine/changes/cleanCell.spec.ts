import { describe, expect, it } from 'vitest';
import type { ColumnKey } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { accept } from '@/engine/testing/accept';
import { changed } from '@/engine/testing/changed';
import { cleanEveryCell } from '@/engine/testing/cleanEveryCell';
import { toDataset } from '@/engine/testing/toDataset';
import type { AcceptedChange } from './acceptedChange';
import type { Change } from './change';
import { cleanCell } from './cleanCell';
import type { CleanedCell } from './cleanedCell';
import { compileCleanPlan } from './compileCleanPlan';

const NAME = toColumnKey(0);
const STATE = toColumnKey(1);
const JOINED = toColumnKey(2);
const PHONE = toColumnKey(2);

describe('cleanCell, each change alone', () => {
  const dataset = toDataset(
    'name,state',
    'Ann,CA',
    'Bob, Calif. ',
    'Cy,\u00A0Texas\u00A0',
    'Di,\tOhio',
    'Ed,New   York'
  );

  it('trims padding, tabs, non-breaking spaces and inner runs, and leaves clean cells and other columns alone', () => {
    const cleaned = cleanEveryCell({
      dataset,
      accepted: [trimState('trim')],
    });

    expect(columnOf({ cleaned, column: STATE })).toEqual([
      unchanged('CA'),
      changed({ value: 'Calif.', issue: 'trim', kind: 'trimWhitespace' }),
      changed({ value: 'Texas', issue: 'trim', kind: 'trimWhitespace' }),
      changed({ value: 'Ohio', issue: 'trim', kind: 'trimWhitespace' }),
      changed({ value: 'New York', issue: 'trim', kind: 'trimWhitespace' }),
    ]);
    expect(
      columnOf({ cleaned, column: NAME }).every((cell) => !cell?.isChanged)
    ).toBe(true);
  });

  describe('mapValues', () => {
    const states = toDataset(
      'name,state',
      'Ann,CA',
      'Bob, Calif. ',
      'Cy,California',
      'Di,ca',
      'Ed,N/A',
      'Flo,Texas'
    );

    it('replaces each variant with its canonical value, matching case and the rest of the text exactly', () => {
      const cleaned = cleanEveryCell({
        dataset: states,
        accepted: [
          accept({
            issue: 'map',
            change: {
              kind: 'mapValues',
              column: STATE,
              groups: [
                {
                  canonical: 'California',
                  variants: ['CA', 'Calif.', 'California'],
                },
                { canonical: '', variants: ['N/A'] },
              ],
            },
          }),
        ],
      });

      expect(columnOf({ cleaned, column: STATE })).toEqual([
        changed({ value: 'California', issue: 'map', kind: 'mapValues' }),
        changed({ value: 'California', issue: 'map', kind: 'mapValues' }),
        unchanged('California'),
        unchanged('ca'),
        changed({ value: '', issue: 'map', kind: 'mapValues' }),
        unchanged('Texas'),
      ]);
    });

    it('matches a variant written with extra whitespace', () => {
      const cleaned = cleanEveryCell({
        dataset: states,
        accepted: [
          accept({
            issue: 'map',
            change: {
              kind: 'mapValues',
              column: STATE,
              groups: [{ canonical: 'California', variants: ['  Calif.\t'] }],
            },
          }),
        ],
      });

      expect(columnOf({ cleaned, column: STATE })[1]).toEqual(
        changed({ value: 'California', issue: 'map', kind: 'mapValues' })
      );
    });

    it('ignores a group with no variants', () => {
      const cleaned = cleanEveryCell({
        dataset: states,
        accepted: [
          accept({
            issue: 'map',
            change: {
              kind: 'mapValues',
              column: STATE,
              groups: [{ canonical: 'California', variants: [] }],
            },
          }),
        ],
      });

      expect(allUnchanged(cleaned)).toBe(true);
    });
  });

  it('standardizes the dates it reads with one meaning, and leaves ambiguous dates and other text alone', () => {
    const dates = toDataset(
      'name,state,joined',
      'Ann,CA,2024/03/04',
      'Bob,CA,13/04/2024',
      'Cy,CA,"Mar 4, 2024"',
      'Di,CA,4 Mar 2024',
      'Ed,CA,2024-03-04',
      'Flo,CA,03/04/2024',
      'Gus,CA,N/A',
      'Hal,CA, 2024/3/4 ',
      'Ivy,CA,04/04/2024'
    );

    const cleaned = cleanEveryCell({
      dataset: dates,
      accepted: [
        accept({
          issue: 'dates',
          change: {
            kind: 'standardizeDates',
            column: JOINED,
            format: 'YYYY-MM-DD',
          },
        }),
      ],
    });

    expect(columnOf({ cleaned, column: JOINED })).toEqual([
      changed({
        value: '2024-03-04',
        issue: 'dates',
        kind: 'standardizeDates',
      }),
      changed({
        value: '2024-04-13',
        issue: 'dates',
        kind: 'standardizeDates',
      }),
      changed({
        value: '2024-03-04',
        issue: 'dates',
        kind: 'standardizeDates',
      }),
      changed({
        value: '2024-03-04',
        issue: 'dates',
        kind: 'standardizeDates',
      }),
      unchanged('2024-03-04'),
      unchanged('03/04/2024'),
      unchanged('N/A'),
      changed({
        value: '2024-03-04',
        issue: 'dates',
        kind: 'standardizeDates',
      }),
      changed({
        value: '2024-04-04',
        issue: 'dates',
        kind: 'standardizeDates',
      }),
    ]);
  });

  it('writes an explicit value into a cell and touches no other cell', () => {
    const cleaned = cleanEveryCell({
      dataset,
      accepted: [
        accept({
          issue: 'set',
          change: {
            kind: 'setCells',
            cells: [{ rowId: toRowId(1), column: STATE, value: 'California' }],
          },
        }),
      ],
    });

    expect(columnOf({ cleaned, column: STATE })[1]).toEqual(
      changed({ value: 'California', issue: 'set', kind: 'setCells' })
    );
    expect(countChanged(cleaned)).toBe(1);
  });

  describe('mergeRows', () => {
    const duplicates = toDataset(
      'name,state,phone',
      'Ann,CA,',
      'Ann,California,555-0100',
      'Bob,TX,555-0101'
    );

    const merge = accept({
      issue: 'merge',
      change: {
        kind: 'mergeRows',
        keep: toRowId(0),
        remove: [toRowId(1)],
        values: [
          { column: STATE, from: toRowId(1) },
          { column: PHONE, from: toRowId(1) },
          { column: NAME, from: toRowId(0) },
        ],
      },
    });

    it('shows the original value of the chosen row in the kept row, and nothing else changes', () => {
      const cleaned = cleanEveryCell({
        dataset: duplicates,
        accepted: [merge],
      });

      expect(cleaned[0]).toEqual([
        unchanged('Ann'),
        changed({ value: 'California', issue: 'merge', kind: 'mergeRows' }),
        changed({ value: '555-0100', issue: 'merge', kind: 'mergeRows' }),
      ]);
      expect(countChanged(cleaned)).toBe(2);
    });
  });

  it.each([
    {
      name: 'removeRows',
      change: { kind: 'removeRows', rows: [toRowId(0), toRowId(2)] },
    },
    {
      name: 'dropDuplicateRows',
      change: {
        kind: 'dropDuplicateRows',
        mode: 'exact',
        groups: [[toRowId(0), toRowId(2)]],
      },
    },
  ] satisfies { name: string; change: Change }[])(
    'reports no cell change for $name, which only removes rows',
    ({ change }) => {
      const cleaned = cleanEveryCell({
        dataset,
        accepted: [accept({ issue: 'removal', change })],
      });

      expect(allUnchanged(cleaned)).toBe(true);
    }
  );
});

describe('cleanCell, precedence on one cell', () => {
  const padded = toDataset('name,state', 'Ann,  CA ');

  it.each([
    {
      name: 'trim accepted first, with the earlier id on trim',
      mapId: 'b',
      accepted: [trimState('a'), mapStateToCalifornia('b')],
    },
    {
      name: 'map accepted first, with the earlier id on map',
      mapId: 'a',
      accepted: [mapStateToCalifornia('a'), trimState('b')],
    },
    {
      name: 'trim accepted first, with the earlier id on map',
      mapId: 'a',
      accepted: [trimState('b'), mapStateToCalifornia('a')],
    },
    {
      name: 'map accepted first, with the earlier id on trim',
      mapId: 'b',
      accepted: [mapStateToCalifornia('b'), trimState('a')],
    },
  ])(
    'gives the mapped value whichever of trim and map is accepted first: $name',
    ({ mapId, accepted }) => {
      const cleaned = cleanEveryCell({ dataset: padded, accepted });

      expect(columnOf({ cleaned, column: STATE })[0]).toEqual(
        changed({ value: 'California', issue: mapId, kind: 'mapValues' })
      );
    }
  );

  it('lets the date format win over the mapping, and the mapping over the trim', () => {
    const dataset = toDataset('name,state,joined', 'Ann,CA, 2024/03/04 ');
    const accepted = [
      accept({
        issue: 'trim',
        change: { kind: 'trimWhitespace', column: JOINED },
      }),
      accept({
        issue: 'map',
        change: {
          kind: 'mapValues',
          column: JOINED,
          groups: [{ canonical: 'mapped', variants: ['2024/03/04'] }],
        },
      }),
      accept({
        issue: 'dates',
        change: {
          kind: 'standardizeDates',
          column: JOINED,
          format: 'D MMM YYYY',
        },
      }),
    ];

    const [trimOnly, mapAndTrim, all] = [
      accepted.slice(0, 1),
      accepted.slice(0, 2),
      accepted,
    ].map(
      (subset) => cleanEveryCell({ dataset, accepted: subset })[0]?.[JOINED]
    );

    expect(trimOnly).toEqual(
      changed({ value: '2024/03/04', issue: 'trim', kind: 'trimWhitespace' })
    );
    expect(mapAndTrim).toEqual(
      changed({ value: 'mapped', issue: 'map', kind: 'mapValues' })
    );
    expect(all).toEqual(
      changed({ value: '4 Mar 2024', issue: 'dates', kind: 'standardizeDates' })
    );
  });

  it('lets an explicit value beat every rule and a merge fill', () => {
    const dataset = toDataset(
      'name,state,joined',
      'Ann,  CA ,2024/03/04',
      'Bob,TX,2024/03/05'
    );

    const cleaned = cleanEveryCell({
      dataset,
      accepted: [
        trimState('trim'),
        mapStateToCalifornia('map'),
        accept({
          issue: 'merge',
          change: {
            kind: 'mergeRows',
            keep: toRowId(0),
            remove: [toRowId(1)],
            values: [{ column: STATE, from: toRowId(1) }],
          },
        }),
        accept({
          issue: 'z-set',
          change: {
            kind: 'setCells',
            cells: [
              { rowId: toRowId(0), column: STATE, value: 'Golden State' },
            ],
          },
        }),
      ],
    });

    expect(columnOf({ cleaned, column: STATE })[0]).toEqual(
      changed({ value: 'Golden State', issue: 'z-set', kind: 'setCells' })
    );
  });

  it('does not feed the output of one rule into another', () => {
    const dataset = toDataset('name,state,joined', 'Ann,CA,2024/03/04');

    const cleaned = cleanEveryCell({
      dataset,
      accepted: [
        accept({
          issue: 'a-map',
          change: {
            kind: 'mapValues',
            column: STATE,
            groups: [{ canonical: '  Golden State ', variants: ['CA'] }],
          },
        }),
        trimState('b-trim'),
        accept({
          issue: 'c-dates',
          change: {
            kind: 'standardizeDates',
            column: JOINED,
            format: 'D MMM YYYY',
          },
        }),
        accept({
          issue: 'd-map',
          change: {
            kind: 'mapValues',
            column: JOINED,
            groups: [{ canonical: 'mapped', variants: ['4 Mar 2024'] }],
          },
        }),
      ],
    });

    expect(cleaned[0]?.[STATE]).toEqual(
      changed({ value: '  Golden State ', issue: 'a-map', kind: 'mapValues' })
    );
    expect(cleaned[0]?.[JOINED]).toEqual(
      changed({
        value: '4 Mar 2024',
        issue: 'c-dates',
        kind: 'standardizeDates',
      })
    );
  });
});

describe('cleanCell, a merge and the rules on its column', () => {
  const dataset = toDataset('name,state', 'Ann,CA', 'Ann,Calif.');

  const merge = accept({
    issue: 'merge',
    change: {
      kind: 'mergeRows',
      keep: toRowId(0),
      remove: [toRowId(1)],
      values: [{ column: STATE, from: toRowId(1) }],
    },
  });

  const mapStates = accept({
    issue: 'map',
    change: {
      kind: 'mapValues',
      column: STATE,
      groups: [{ canonical: 'California', variants: ['CA', 'Calif.'] }],
    },
  });

  it('shows the merged-in value, and the merge is responsible for it', () => {
    const cleaned = cleanEveryCell({ dataset, accepted: [merge] });

    expect(cleaned[0]?.[STATE]).toEqual(
      changed({ value: 'Calif.', issue: 'merge', kind: 'mergeRows' })
    );
  });

  it('applies a mapping to the merged-in value, and the merge stays responsible', () => {
    const cleaned = cleanEveryCell({ dataset, accepted: [merge, mapStates] });

    expect(cleaned[0]?.[STATE]).toEqual(
      changed({ value: 'California', issue: 'merge', kind: 'mergeRows' })
    );
  });

  it('leaves the cell unchanged when the rules bring the merged-in value back to the original', () => {
    const original = toDataset('name,state', 'Ann,California', 'Ann,Calif.');

    const cleaned = cleanEveryCell({
      dataset: original,
      accepted: [merge, mapStates],
    });

    expect(cleaned[0]?.[STATE]).toEqual(unchanged('California'));
  });
});

describe('cleanCell, what counts as a change', () => {
  it('reports an explicit value equal to the original as no change, and still lets it beat a rule', () => {
    const dataset = toDataset('name,state', 'Ann, CA ');

    const cleaned = cleanEveryCell({
      dataset,
      accepted: [
        trimState('trim'),
        accept({
          issue: 'set',
          change: {
            kind: 'setCells',
            cells: [{ rowId: toRowId(0), column: STATE, value: ' CA ' }],
          },
        }),
      ],
    });

    expect(cleaned[0]?.[STATE]).toEqual(unchanged(' CA '));
  });

  it('does not credit a merge that fills a cell with the value it already has', () => {
    const dataset = toDataset('name,state', 'Ann, CA ', 'Ann, CA ');

    const cleaned = cleanEveryCell({
      dataset,
      accepted: [
        accept({
          issue: 'merge',
          change: {
            kind: 'mergeRows',
            keep: toRowId(0),
            remove: [toRowId(1)],
            values: [{ column: STATE, from: toRowId(1) }],
          },
        }),
        trimState('trim'),
      ],
    });

    expect(cleaned[0]?.[STATE]).toEqual(
      changed({ value: 'CA', issue: 'trim', kind: 'trimWhitespace' })
    );
  });

  it('ignores a merge choice that names a row or a column the dataset does not have', () => {
    const dataset = toDataset('name,state', 'Ann,CA', 'Bob,TX');

    const cleaned = cleanEveryCell({
      dataset,
      accepted: [
        accept({
          issue: 'merge',
          change: {
            kind: 'mergeRows',
            keep: toRowId(0),
            remove: [toRowId(1)],
            values: [
              { column: STATE, from: toRowId(99) },
              { column: toColumnKey(9), from: toRowId(1) },
            ],
          },
        }),
      ],
    });

    expect(allUnchanged(cleaned)).toBe(true);
  });

  it('cleans the value it is given, whatever else the dataset holds at that cell', () => {
    const dataset = toDataset('name,state', 'Ann,CA');
    const plan = compileCleanPlan({
      dataset,
      accepted: [trimState('trim')],
    });

    expect(
      cleanCell({ plan, rowId: toRowId(0), column: STATE, value: '  TX ' })
    ).toEqual(changed({ value: 'TX', issue: 'trim', kind: 'trimWhitespace' }));
  });

  it('leaves every cell unchanged when nothing is accepted', () => {
    const dataset = toDataset('name,state', 'Ann, CA ', 'Bob,TX');

    expect(allUnchanged(cleanEveryCell({ dataset, accepted: [] }))).toBe(true);
  });

  it('restores the original value once the change is no longer accepted', () => {
    const dataset = toDataset('name,state', 'Ann, CA ');
    const trim = trimState('trim');

    const accepted = cleanEveryCell({ dataset, accepted: [trim] });
    const undone = cleanEveryCell({ dataset, accepted: [] });

    expect(accepted[0]?.[STATE]).toEqual(
      changed({ value: 'CA', issue: 'trim', kind: 'trimWhitespace' })
    );
    expect(undone[0]?.[STATE]).toEqual(unchanged(' CA '));
  });

  it('never mutates the dataset', () => {
    const dataset = toDataset(
      'name,state,joined',
      'Ann, CA ,2024/03/04',
      'Bob,TX,'
    );
    const before = structuredClone(dataset);

    cleanEveryCell({
      dataset,
      accepted: [
        trimState('trim'),
        accept({
          issue: 'dates',
          change: {
            kind: 'standardizeDates',
            column: JOINED,
            format: 'MM/DD/YYYY',
          },
        }),
        accept({
          issue: 'merge',
          change: {
            kind: 'mergeRows',
            keep: toRowId(0),
            remove: [toRowId(1)],
            values: [{ column: JOINED, from: toRowId(1) }],
          },
        }),
      ],
    });

    expect(dataset).toEqual(before);
  });
});

function trimState(issue: string): AcceptedChange {
  return accept({ issue, change: { kind: 'trimWhitespace', column: STATE } });
}

function mapStateToCalifornia(issue: string): AcceptedChange {
  return accept({
    issue,
    change: {
      kind: 'mapValues',
      column: STATE,
      groups: [{ canonical: 'California', variants: ['CA'] }],
    },
  });
}

function columnOf({
  cleaned,
  column,
}: {
  cleaned: readonly CleanedCell[][];
  column: ColumnKey;
}): (CleanedCell | undefined)[] {
  return cleaned.map((cells) => cells[column]);
}

function countChanged(cleaned: readonly CleanedCell[][]): number {
  return cleaned.flat().filter((cell) => cell.isChanged).length;
}

function allUnchanged(cleaned: readonly CleanedCell[][]): boolean {
  return countChanged(cleaned) === 0;
}

function unchanged(value: string): CleanedCell {
  return { isChanged: false, value };
}
