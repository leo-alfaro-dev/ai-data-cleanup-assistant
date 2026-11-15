import { describe, expect, it, vi } from 'vitest';
import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import { compileCleanPlan } from '@/engine/changes/compileCleanPlan';
import type { ColumnKey } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { accept } from '@/engine/testing/accept';
import { cleanEveryCell } from '@/engine/testing/cleanEveryCell';
import { origin } from '@/engine/testing/origin';
import { toDataset } from '@/engine/testing/toDataset';
import { toDatasetFromText } from '@/engine/testing/toDatasetFromText';
import { buildChangeLog } from './buildChangeLog';
import type { ChangeLogEntry } from './changeLogEntry';

const NAME = toColumnKey(0);
const STATE = toColumnKey(1);
const EMAIL = toColumnKey(1);

describe('buildChangeLog', () => {
  const people = toDataset(
    'name,state',
    ' Ann ,CA',
    'Bob,Texas',
    'Cy ,CA',
    'Di,Ohio'
  );

  it('logs nothing when nothing is accepted', () => {
    const plan = compileCleanPlan({ accepted: [], dataset: people });

    expect([...buildChangeLog({ dataset: people, plan })]).toEqual([]);
  });

  it('logs the cells that differ with before, after and who changed them', () => {
    const plan = compileCleanPlan({
      accepted: [trim({ issue: 'trim', column: NAME })],
      dataset: people,
    });

    expect([...buildChangeLog({ dataset: people, plan })]).toEqual([
      {
        kind: 'cellChanged',
        rowId: 0,
        column: NAME,
        before: ' Ann ',
        after: 'Ann',
        origin: origin({ issue: 'trim', kind: 'trimWhitespace' }),
      },
      {
        kind: 'cellChanged',
        rowId: 2,
        column: NAME,
        before: 'Cy ',
        after: 'Cy',
        origin: origin({ issue: 'trim', kind: 'trimWhitespace' }),
      },
    ]);
  });

  it('skips a cell whose cleaned value equals its original', () => {
    const plan = compileCleanPlan({
      accepted: [
        accept({
          issue: 'map',
          change: {
            kind: 'mapValues',
            column: STATE,
            groups: [{ canonical: 'CA', variants: ['CA'] }],
          },
        }),
      ],
      dataset: people,
    });

    expect([...buildChangeLog({ dataset: people, plan })]).toEqual([]);
  });

  it('lists rows in file order and cells in column order, with each removal where its row sits', () => {
    const plan = compileCleanPlan({
      accepted: [
        trim({ issue: 'trim-name', column: NAME }),
        trim({ issue: 'trim-state', column: STATE }),
        remove({ issue: 'remove', rows: [1] }),
        accept({
          issue: 'cells',
          change: {
            kind: 'setCells',
            cells: [
              { rowId: toRowId(3), column: STATE, value: 'OH' },
              { rowId: toRowId(0), column: STATE, value: 'California' },
            ],
          },
        }),
      ],
      dataset: people,
    });

    expect(summarize([...buildChangeLog({ dataset: people, plan })])).toEqual([
      'cell 0:0',
      'cell 0:1',
      'removed 1',
      'cell 2:0',
      'cell 3:1',
    ]);
  });

  it('logs a removed row once, and none of its cells, whatever else touches it', () => {
    const plan = compileCleanPlan({
      accepted: [
        trim({ issue: 'trim', column: NAME }),
        remove({ issue: 'remove', rows: [0] }),
        accept({
          issue: 'cells',
          change: {
            kind: 'setCells',
            cells: [{ rowId: toRowId(0), column: STATE, value: 'XX' }],
          },
        }),
      ],
      dataset: people,
    });

    const entries = [...buildChangeLog({ dataset: people, plan })];

    expect(entries).toContainEqual({
      kind: 'rowRemoved',
      rowId: 0,
      origin: origin({ issue: 'remove', kind: 'removeRows' }),
    });
    expect(summarize(entries)).toEqual(['removed 0', 'cell 2:0']);
  });

  it('never asks for the cells of a removed row', () => {
    const plan = compileCleanPlan({
      accepted: [remove({ issue: 'remove', rows: [1, 2] })],
      dataset: people,
    });
    const asked = vi.spyOn(plan.explicitCells, 'get');

    const entries = [...buildChangeLog({ dataset: people, plan })];

    const askedRows = new Set(asked.mock.calls.map(([rowId]) => rowId));
    expect(summarize(entries)).toEqual(['removed 1', 'removed 2']);
    expect([...askedRows]).toEqual([0, 3]);
  });

  it('reads the rows only as its entries are asked for', () => {
    const plan = compileCleanPlan({
      accepted: [trim({ issue: 'trim', column: NAME })],
      dataset: people,
    });
    const asked = vi.spyOn(plan.explicitCells, 'get');

    const entries = buildChangeLog({ dataset: people, plan });
    expect(asked).not.toHaveBeenCalled();

    const first = entries.next();
    expect(first.done).toBe(false);
    expect(new Set(asked.mock.calls.map(([rowId]) => rowId))).toEqual(
      new Set([0])
    );
  });

  it('logs the cells a merge fills in the kept row and the rows it removes', () => {
    const contacts = toDataset(
      'name,email',
      'Ann,',
      'Ann Lee,ann@example.com',
      'Bob,bob@example.com'
    );
    const plan = compileCleanPlan({
      accepted: [
        accept({
          issue: 'merge',
          change: {
            kind: 'mergeRows',
            keep: toRowId(0),
            remove: [toRowId(1)],
            values: [{ column: EMAIL, from: toRowId(1) }],
          },
        }),
      ],
      dataset: contacts,
    });

    expect([...buildChangeLog({ dataset: contacts, plan })]).toEqual([
      {
        kind: 'cellChanged',
        rowId: 0,
        column: EMAIL,
        before: '',
        after: 'ann@example.com',
        origin: origin({ issue: 'merge', kind: 'mergeRows' }),
      },
      {
        kind: 'rowRemoved',
        rowId: 1,
        origin: origin({ issue: 'merge', kind: 'mergeRows' }),
      },
    ]);
  });

  it('lists exactly the cells that cleanCell changes, in the rows it keeps', () => {
    const dataset = toDataset(
      'name,state,joined',
      ' Ann ,CA,2024/03/04',
      'Bob, Calif. ,"Mar 4, 2024"',
      'Cy,California,03/04/2024',
      'Cy,California,03/04/2024',
      'Di,Texas,2024-03-04'
    );
    const accepted = [
      trim({ issue: 'trim', column: NAME }),
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
          ],
        },
      }),
      accept({
        issue: 'dates',
        change: {
          kind: 'standardizeDates',
          column: toColumnKey(2),
          format: 'YYYY-MM-DD',
        },
      }),
      accept({
        issue: 'drop',
        change: {
          kind: 'dropDuplicateRows',
          mode: 'exact',
          groups: [[toRowId(2), toRowId(3)]],
        },
      }),
    ];
    const plan = compileCleanPlan({ accepted: accepted, dataset });
    const expected = cleanEveryCell({ dataset, accepted }).flatMap(
      (cells, rowIndex) =>
        plan.removedRows.has(toRowId(rowIndex))
          ? [`removed ${rowIndex}`]
          : cells.flatMap((cell, columnIndex) =>
              cell.isChanged ? [`cell ${rowIndex}:${columnIndex}`] : []
            )
    );

    const entries = [...buildChangeLog({ dataset, plan })];

    expect(summarize(entries)).toEqual(expected);
    expect(expected).toEqual([
      'cell 0:0',
      'cell 0:1',
      'cell 0:2',
      'cell 1:1',
      'cell 1:2',
      'removed 3',
    ]);
    expect(entries.at(-1)).toEqual({
      kind: 'rowRemoved',
      rowId: 3,
      origin: origin({ issue: 'drop', kind: 'dropDuplicateRows' }),
    });
  });

  it('starts with the encoding conversion when the file was Windows-1252', () => {
    const dataset = toDatasetFromText({
      text: 'name\n Jos\u00E9 \nBob',
      encoding: 'windows-1252',
    });
    const plan = compileCleanPlan({
      accepted: [trim({ issue: 'trim', column: NAME })],
      dataset,
    });

    const entries = [...buildChangeLog({ dataset, plan })];

    expect(entries[0]).toEqual({
      kind: 'encodingConverted',
      from: 'windows-1252',
      to: 'utf-8',
    });
    expect(summarize(entries)).toEqual(['converted', 'cell 0:0']);
  });

  it('logs the conversion even when nothing else changes', () => {
    const dataset = toDatasetFromText({
      text: 'name\nJos\u00E9',
      encoding: 'windows-1252',
    });

    const plan = compileCleanPlan({ accepted: [], dataset });

    expect([...buildChangeLog({ dataset, plan })]).toEqual([
      { kind: 'encodingConverted', from: 'windows-1252', to: 'utf-8' },
    ]);
  });

  it('logs no conversion for a UTF-8 file', () => {
    const plan = compileCleanPlan({
      accepted: [trim({ issue: 'trim', column: NAME })],
      dataset: people,
    });

    const kinds = [...buildChangeLog({ dataset: people, plan })].map(
      (entry) => entry.kind
    );

    expect(kinds).not.toContain('encodingConverted');
    expect(kinds).toContain('cellChanged');
  });

  it('leaves the dataset as it found it', () => {
    const before = structuredClone(people);
    const plan = compileCleanPlan({
      accepted: [trim({ issue: 'trim', column: NAME })],
      dataset: people,
    });

    const entries = [...buildChangeLog({ dataset: people, plan })];

    expect(entries).toHaveLength(2);
    expect(people).toEqual(before);
  });
});

function trim({
  issue,
  column,
}: {
  issue: string;
  column: ColumnKey;
}): AcceptedChange {
  return accept({ issue, change: { kind: 'trimWhitespace', column } });
}

function remove({
  issue,
  rows,
}: {
  issue: string;
  rows: readonly number[];
}): AcceptedChange {
  return accept({
    issue,
    change: { kind: 'removeRows', rows: rows.map(toRowId) },
  });
}

function summarize(entries: readonly ChangeLogEntry[]): string[] {
  return entries.map((entry) => {
    switch (entry.kind) {
      case 'encodingConverted':
        return 'converted';
      case 'cellChanged':
        return `cell ${entry.rowId}:${entry.column}`;
      case 'rowRemoved':
        return `removed ${entry.rowId}`;
    }
  });
}
