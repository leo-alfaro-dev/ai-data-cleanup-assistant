import { describe, expect, it } from 'vitest';
import { compileCleanPlan } from '@/engine/changes/compileCleanPlan';
import { BYTE_ORDER_MARK } from '@/engine/dataset/byteOrderMark';
import type { Dataset, SourceFormat } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { accept } from '@/engine/testing/accept';
import { origin } from '@/engine/testing/origin';
import { toDataset } from '@/engine/testing/toDataset';
import { toDatasetFromText } from '@/engine/testing/toDatasetFromText';
import { buildChangeLog } from './buildChangeLog';
import type { ChangeLogEntry } from './changeLogEntry';
import { exportChangeLog } from './exportChangeLog';

const HEADER = 'row,column,column_number,action,before,after,change,issue';

const orders = toDataset('id,name,,name', '1,Ann,x,Ann', '2,Bob,y,Bob');

describe('exportChangeLog', () => {
  it('writes only the header when there are no entries', () => {
    expect(exportChangeLog({ dataset: orders, entries: [] })).toBe(
      `${HEADER}\n`
    );
  });

  it('writes a changed cell with its spreadsheet row, header text and column number', () => {
    const entries = [
      cellChanged({ rowId: 0, column: 1, before: ' Ann ', after: 'Ann' }),
      cellChanged({ rowId: 1, column: 0, before: '2', after: '3' }),
    ];

    expect(exportChangeLog({ dataset: orders, entries })).toBe(
      [
        HEADER,
        '2,name,2,changed, Ann ,Ann,trimWhitespace,trim',
        '3,id,1,changed,2,3,trimWhitespace,trim',
        '',
      ].join('\n')
    );
  });

  it('tells empty and repeated headers apart by column number', () => {
    const entries = [
      cellChanged({ rowId: 0, column: 1, before: 'a', after: 'b' }),
      cellChanged({ rowId: 0, column: 2, before: 'a', after: 'b' }),
      cellChanged({ rowId: 0, column: 3, before: 'a', after: 'b' }),
    ];

    expect(exportChangeLog({ dataset: orders, entries })).toBe(
      [
        HEADER,
        '2,name,2,changed,a,b,trimWhitespace,trim',
        '2,,3,changed,a,b,trimWhitespace,trim',
        '2,name,4,changed,a,b,trimWhitespace,trim',
        '',
      ].join('\n')
    );
  });

  it('writes a removal with no column, before or after', () => {
    const entries: ChangeLogEntry[] = [
      {
        kind: 'rowRemoved',
        rowId: toRowId(3),
        origin: origin({ issue: 'drop', kind: 'dropDuplicateRows' }),
      },
    ];

    expect(exportChangeLog({ dataset: orders, entries })).toBe(
      `${HEADER}\n5,,,removed,,,dropDuplicateRows,drop\n`
    );
  });

  it('writes the encoding conversion with no row or column', () => {
    const entries: ChangeLogEntry[] = [
      { kind: 'encodingConverted', from: 'windows-1252', to: 'utf-8' },
    ];

    expect(exportChangeLog({ dataset: orders, entries })).toBe(
      `${HEADER}\n,,,converted,windows-1252,utf-8,,\n`
    );
  });

  it('quotes only what the format requires and writes formula-like values verbatim', () => {
    const entries = [
      cellChanged({
        rowId: 0,
        column: 1,
        before: 'Doe, Jane',
        after: 'She said "hi"',
      }),
      cellChanged({
        rowId: 0,
        column: 1,
        before: 'line one\nline two',
        after: 'a\r\nb',
      }),
      cellChanged({
        rowId: 0,
        column: 1,
        before: ' =SUM(A1)\u00A0',
        after: '+1',
      }),
    ];

    expect(exportChangeLog({ dataset: orders, entries })).toBe(
      [
        HEADER,
        '2,name,2,changed,"Doe, Jane","She said ""hi""",trimWhitespace,trim',
        '2,name,2,changed,"line one\nline two","a\r\nb",trimWhitespace,trim',
        '2,name,2,changed, =SUM(A1)\u00A0,+1,trimWhitespace,trim',
        '',
      ].join('\n')
    );
  });

  it('quotes a header that contains the delimiter', () => {
    const dataset = toDataset('"a,b",c', 'x,y');
    const entries = [
      cellChanged({ rowId: 0, column: 0, before: 'x', after: 'z' }),
    ];

    expect(exportChangeLog({ dataset, entries })).toBe(
      `${HEADER}\n2,"a,b",1,changed,x,z,trimWhitespace,trim\n`
    );
  });

  it("uses the cleaned file's delimiter, line break and byte order mark", () => {
    const dataset = withFormat({
      dataset: orders,
      format: {
        delimiter: ';',
        lineBreak: '\r\n',
        hasByteOrderMark: true,
        encoding: 'utf-8',
      },
    });
    const entries = [
      cellChanged({ rowId: 0, column: 1, before: 'a;b', after: 'c,d' }),
    ];

    expect(exportChangeLog({ dataset, entries })).toBe(
      [
        `${BYTE_ORDER_MARK}${HEADER.replaceAll(',', ';')}`,
        '2;name;2;changed;"a;b";c,d;trimWhitespace;trim',
        '',
      ].join('\r\n')
    );
  });

  it('starts with a byte order mark when the source was Windows-1252, as the cleaned file does', () => {
    const dataset = withFormat({
      dataset: orders,
      format: {
        delimiter: ',',
        lineBreak: '\n',
        hasByteOrderMark: false,
        encoding: 'windows-1252',
      },
    });
    const entries: ChangeLogEntry[] = [
      { kind: 'encodingConverted', from: 'windows-1252', to: 'utf-8' },
    ];

    expect(exportChangeLog({ dataset, entries })).toBe(
      `${BYTE_ORDER_MARK}${HEADER}\n,,,converted,windows-1252,utf-8,,\n`
    );
  });

  it('writes the log that buildChangeLog builds, one parseable row per entry', () => {
    const dataset = toDataset(
      'name,state',
      ' Ann ,CA',
      'Bob,"Calif., "',
      'Cy,CA',
      'Cy,CA'
    );
    const plan = compileCleanPlan({
      dataset,
      accepted: [
        accept({
          issue: 'trim',
          change: { kind: 'trimWhitespace', column: toColumnKey(0) },
        }),
        accept({
          issue: 'map',
          change: {
            kind: 'mapValues',
            column: toColumnKey(1),
            groups: [{ canonical: 'California', variants: ['CA', 'Calif.,'] }],
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
      ],
    });

    const text = exportChangeLog({
      dataset,
      entries: buildChangeLog({ dataset, plan }),
    });

    expect(toDatasetFromText({ text }).rows).toEqual([
      ['2', 'name', '1', 'changed', ' Ann ', 'Ann', 'trimWhitespace', 'trim'],
      ['2', 'state', '2', 'changed', 'CA', 'California', 'mapValues', 'map'],
      [
        '3',
        'state',
        '2',
        'changed',
        'Calif., ',
        'California',
        'mapValues',
        'map',
      ],
      ['4', 'state', '2', 'changed', 'CA', 'California', 'mapValues', 'map'],
      ['5', '', '', 'removed', '', '', 'dropDuplicateRows', 'drop'],
    ]);
  });
});

function cellChanged({
  rowId,
  column,
  before,
  after,
}: {
  rowId: number;
  column: number;
  before: string;
  after: string;
}): ChangeLogEntry {
  return {
    kind: 'cellChanged',
    rowId: toRowId(rowId),
    column: toColumnKey(column),
    before,
    after,
    origin: origin({ issue: 'trim', kind: 'trimWhitespace' }),
  };
}

function withFormat({
  dataset,
  format,
}: {
  dataset: Dataset;
  format: SourceFormat;
}): Dataset {
  return { ...dataset, format };
}
