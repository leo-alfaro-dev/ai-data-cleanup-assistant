import { describe, expect, it, vi } from 'vitest';
import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import { compileCleanPlan } from '@/engine/changes/compileCleanPlan';
import { BYTE_ORDER_MARK } from '@/engine/dataset/byteOrderMark';
import type { Dataset, LineBreak } from '@/engine/dataset/dataset';
import { DELIMITERS, LINE_BREAKS } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { accept } from '@/engine/testing/accept';
import { cleanEveryCell } from '@/engine/testing/cleanEveryCell';
import { toDataset } from '@/engine/testing/toDataset';
import { toDatasetFromText } from '@/engine/testing/toDatasetFromText';
import { exportCsv } from './exportCsv';

describe('exportCsv, round trip with no decisions', () => {
  const formats = DELIMITERS.flatMap((delimiter) =>
    [false, true].flatMap((hasByteOrderMark) =>
      LINE_BREAKS.map((lineBreak) => ({
        name: `${JSON.stringify(delimiter)} ${hasByteOrderMark ? 'with' : 'without'} a byte order mark, ${JSON.stringify(lineBreak)}`,
        delimiter,
        hasByteOrderMark,
        lineBreak,
      }))
    )
  );

  it.each(formats)(
    'reproduces the file: $name',
    ({ delimiter, hasByteOrderMark, lineBreak }) => {
      const text = toText({
        lines: [
          ['name', 'city', 'age'],
          ['Ada', 'Austin', '34'],
          ['Bob', ' Boston ', '41'],
          ['Cy', '\u00A0Dallas\u00A0', '29'],
          ['Di', '', ''],
        ].map((fields) => fields.join(delimiter)),
        lineBreak,
        hasByteOrderMark,
      });
      const dataset = toDatasetFromText({ text });

      const exported = exportCsv({ dataset, plan: emptyPlan(dataset) });
      const readBack = toDatasetFromText({ text: exported });

      expect(dataset.format).toMatchObject({
        delimiter,
        lineBreak,
        hasByteOrderMark,
      });
      expect(exported).toBe(text);
      expect(readBack.columns).toEqual(dataset.columns);
      expect(readBack.rows).toEqual(dataset.rows);
      expect(readBack.format).toEqual(dataset.format);
    }
  );

  describe.each(DELIMITERS)('with %j', (delimiter) => {
    it.each(['\n', '\r\n'] as const)(
      'keeps a value with the delimiter, a quote or a line break, with %j line breaks',
      (lineBreak) => {
        const text = toText({
          lines: [
            ['name', 'note', 'quote'].join(delimiter),
            [
              `"Doe${delimiter} Jane"`,
              '"line one\nline two"',
              '"She said ""hi"""',
            ].join(delimiter),
            ['Bob', '"windows\r\nbreak"', '"""quoted"""'].join(delimiter),
          ],
          lineBreak,
          hasByteOrderMark: false,
        });
        const dataset = toDatasetFromText({ text });

        const exported = exportCsv({ dataset, plan: emptyPlan(dataset) });

        expect(dataset.rows).toEqual([
          [`Doe${delimiter} Jane`, 'line one\nline two', 'She said "hi"'],
          ['Bob', 'windows\r\nbreak', '"quoted"'],
        ]);
        expect(exported).toBe(text);
        expect(toDatasetFromText({ text: exported }).rows).toEqual(
          dataset.rows
        );
      }
    );
  });

  it('writes leading, trailing and non-breaking spaces without quoting them', () => {
    const dataset = toDataset(
      'name,city',
      '  Ada ,Austin\u00A0',
      '\u00A0Bob,\tBoston'
    );

    const exported = exportCsv({ dataset, plan: emptyPlan(dataset) });

    expect(exported).toBe(
      'name,city\n  Ada ,Austin\u00A0\n\u00A0Bob,\tBoston\n'
    );
  });

  it('writes formula-like values exactly as they are', () => {
    const text = [
      'id,formula',
      '1,=SUM(A1)',
      '2,+1',
      '3,@x',
      '4,-2+3',
      '5,"=HYPERLINK(""http://example.com"")"',
      '',
    ].join('\n');
    const dataset = toDatasetFromText({ text });

    const exported = exportCsv({ dataset, plan: emptyPlan(dataset) });

    expect(exported).toBe(text);
    expect(
      toDatasetFromText({ text: exported }).rows.map((row) => row[1])
    ).toEqual([
      '=SUM(A1)',
      '+1',
      '@x',
      '-2+3',
      '=HYPERLINK("http://example.com")',
    ]);
  });

  it('keeps empty and repeated headers in place', () => {
    const dataset = toDataset('name,,name,', 'Ada,1,Al,x');

    const exported = exportCsv({ dataset, plan: emptyPlan(dataset) });

    expect(exported).toBe('name,,name,\nAda,1,Al,x\n');
    expect(toDatasetFromText({ text: exported }).columns).toEqual(
      dataset.columns
    );
  });

  it('writes a padded short row and a row that added unnamed columns at full width', () => {
    const dataset = toDataset('a,b,c', '1', '1,2,3,4', '5,6,7');

    const exported = exportCsv({ dataset, plan: emptyPlan(dataset) });

    expect(exported).toBe('a,b,c,\n1,,,\n1,2,3,4\n5,6,7,\n');
    expect(toDatasetFromText({ text: exported }).rows).toEqual(dataset.rows);
  });
});

describe('exportCsv, encoding', () => {
  it('writes a Windows-1252 file as UTF-8 with a byte order mark', () => {
    const text = 'name,city\nJos\u00E9,Z\u00FCrich\n';
    const dataset = toDatasetFromText({ text, encoding: 'windows-1252' });

    const exported = exportCsv({ dataset, plan: emptyPlan(dataset) });
    const readBack = toDatasetFromText({ text: exported });

    expect(exported).toBe(`${BYTE_ORDER_MARK}${text}`);
    expect(readBack.format.hasByteOrderMark).toBe(true);
    expect(readBack.rows).toEqual(dataset.rows);
  });

  it('keeps a single byte order mark on a Windows-1252 file that had one', () => {
    const dataset = toDatasetFromText({
      text: `${BYTE_ORDER_MARK}name\nJos\u00E9\n`,
      encoding: 'windows-1252',
    });

    const exported = exportCsv({ dataset, plan: emptyPlan(dataset) });

    expect(exported).toBe(`${BYTE_ORDER_MARK}name\nJos\u00E9\n`);
  });

  it('adds no byte order mark to a UTF-8 file that had none', () => {
    const dataset = toDataset('name', 'Jos\u00E9');

    const exported = exportCsv({ dataset, plan: emptyPlan(dataset) });

    expect(exported.startsWith(BYTE_ORDER_MARK)).toBe(false);
  });
});

describe('exportCsv, with accepted changes', () => {
  const customers = toDataset(
    'id,name,state,joined,note',
    '1,Ann,CA,2024/03/04,keep',
    '2,Bob, Calif. ,"Mar 4, 2024",',
    '3,Cy,California,4 Mar 2024,x',
    '4,Di,Texas,2024-03-04,',
    '5,Ann,CA,2024/03/04,keep',
    '6,Ed,N/A,03/04/2024,"line one\nline two"'
  );
  const accepted: AcceptedChange[] = [
    accept({
      issue: 'trim',
      change: { kind: 'trimWhitespace', column: toColumnKey(2) },
    }),
    accept({
      issue: 'map',
      change: {
        kind: 'mapValues',
        column: toColumnKey(2),
        groups: [
          {
            canonical: 'California',
            variants: ['CA', 'Calif.', 'California'],
          },
          { canonical: '', variants: ['N/A'] },
        ],
      },
    }),
    accept({
      issue: 'dates',
      change: {
        kind: 'standardizeDates',
        column: toColumnKey(3),
        format: 'YYYY-MM-DD',
      },
    }),
    accept({
      issue: 'cell',
      change: {
        kind: 'setCells',
        cells: [
          { rowId: toRowId(3), column: toColumnKey(1), value: 'Doe, Di' },
        ],
      },
    }),
    accept({
      issue: 'merge',
      change: {
        kind: 'mergeRows',
        keep: toRowId(1),
        remove: [toRowId(2)],
        values: [{ column: toColumnKey(4), from: toRowId(2) }],
      },
    }),
    accept({
      issue: 'drop',
      change: {
        kind: 'dropDuplicateRows',
        mode: 'exact',
        groups: [[toRowId(0), toRowId(4)]],
      },
    }),
  ];

  it('writes the cleaned value of every cell and leaves removed rows out', () => {
    const plan = compileCleanPlan({ accepted, dataset: customers });

    const exported = exportCsv({ dataset: customers, plan });

    expect(toDatasetFromText({ text: exported }).rows).toEqual([
      ['1', 'Ann', 'California', '2024-03-04', 'keep'],
      ['2', 'Bob', 'California', '2024-03-04', 'x'],
      ['4', 'Doe, Di', 'Texas', '2024-03-04', ''],
      ['6', 'Ed', '', '03/04/2024', 'line one\nline two'],
    ]);
    expect(exported).toContain('\n4,"Doe, Di",Texas,');
  });

  it('writes exactly what cleanCell gives for every cell of the rows it keeps', () => {
    const plan = compileCleanPlan({ accepted, dataset: customers });
    const cleaned = cleanEveryCell({ dataset: customers, accepted });
    const expected = cleaned
      .filter((_, rowIndex) => !plan.removedRows.has(toRowId(rowIndex)))
      .map((cells) => cells.map((cell) => cell.value));

    const exported = exportCsv({ dataset: customers, plan });

    expect(toDatasetFromText({ text: exported }).rows).toEqual(expected);
    expect(plan.removedRows.size).toBe(2);
  });

  it('never asks for the cells of a removed row', () => {
    const plan = compileCleanPlan({ accepted, dataset: customers });
    const asked = vi.spyOn(plan.explicitCells, 'get');

    exportCsv({ dataset: customers, plan });

    const askedRows = asked.mock.calls.map(([rowId]) => rowId);
    expect(askedRows).toEqual(expect.arrayContaining([0, 1, 3, 5]));
    expect(askedRows).not.toContain(2);
    expect(askedRows).not.toContain(4);
  });

  it('writes only the header when every row is removed', () => {
    const dataset = toDataset('id,name', '1,a', '2,b');
    const plan = compileCleanPlan({
      dataset,
      accepted: [
        accept({
          issue: 'remove',
          change: { kind: 'removeRows', rows: [toRowId(0), toRowId(1)] },
        }),
      ],
    });

    expect(exportCsv({ dataset, plan })).toBe('id,name\n');
  });

  it('writes an empty value as a quoted field when it is the only one on its line', () => {
    const dataset = toDataset('name', 'Ann', 'N/A', 'Cy');
    const plan = compileCleanPlan({
      dataset,
      accepted: [
        accept({
          issue: 'map',
          change: {
            kind: 'mapValues',
            column: toColumnKey(0),
            groups: [{ canonical: '', variants: ['N/A'] }],
          },
        }),
      ],
    });

    expect(exportCsv({ dataset, plan })).toBe('name\nAnn\n""\nCy\n');
  });

  it('writes a row of several empty values as delimiters only', () => {
    const dataset = toDataset('a;b', '1;2', '3;4');
    const plan = compileCleanPlan({
      dataset,
      accepted: [
        accept({
          issue: 'cells',
          change: {
            kind: 'setCells',
            cells: [
              { rowId: toRowId(1), column: toColumnKey(0), value: '' },
              { rowId: toRowId(1), column: toColumnKey(1), value: '' },
            ],
          },
        }),
      ],
    });

    expect(exportCsv({ dataset, plan })).toBe('a;b\n1;2\n;\n');
  });

  it('leaves the dataset as it found it', () => {
    const before = structuredClone(customers);
    const plan = compileCleanPlan({ accepted, dataset: customers });

    exportCsv({ dataset: customers, plan });

    expect(customers).toEqual(before);
  });
});

function emptyPlan(dataset: Dataset) {
  return compileCleanPlan({ accepted: [], dataset });
}

function toText({
  lines,
  lineBreak,
  hasByteOrderMark,
}: {
  lines: readonly string[];
  lineBreak: LineBreak;
  hasByteOrderMark: boolean;
}): string {
  const prefix = hasByteOrderMark ? BYTE_ORDER_MARK : '';

  return prefix + lines.join(lineBreak) + lineBreak;
}
