import { describe, expect, it } from 'vitest';
import { toDataset } from '@/engine/testing/toDataset';
import type { Dataset } from './dataset';
import { parseCsv } from './parseCsv';

describe('parseCsv', () => {
  it.each([
    { name: 'comma', delimiter: ',' },
    { name: 'semicolon', delimiter: ';' },
    { name: 'tab', delimiter: '\t' },
    { name: 'pipe', delimiter: '|' },
  ])('detects a $name delimiter', ({ delimiter }) => {
    const dataset = toDataset(
      ['name', 'city', 'age'].join(delimiter),
      ['Alice', 'Austin', '34'].join(delimiter),
      ['Bob', 'Boston', '41'].join(delimiter)
    );

    expect(dataset.format.delimiter).toBe(delimiter);
    expect(headers(dataset)).toEqual(['name', 'city', 'age']);
    expect(dataset.rows).toEqual([
      ['Alice', 'Austin', '34'],
      ['Bob', 'Boston', '41'],
    ]);
  });

  it('prefers semicolons when commas only appear inside values', () => {
    const dataset = toDataset('name;amount', 'Alice;1,50', 'Bob;2,75');

    expect(dataset.format.delimiter).toBe(';');
    expect(dataset.rows).toEqual([
      ['Alice', '1,50'],
      ['Bob', '2,75'],
    ]);
  });

  it.each([
    { name: 'ends with a line break', lines: ['name;age', 'Ada;34', ''] },
    { name: 'has blank lines', lines: ['name;age', '', 'Ada;34', '', 'Bo;41'] },
  ])('detects the delimiter of a small file that $name', ({ lines }) => {
    const dataset = toDataset(...lines);

    expect(dataset.format.delimiter).toBe(';');
    expect(headers(dataset)).toEqual(['name', 'age']);
  });

  it('keeps a quoted delimiter inside its value', () => {
    const dataset = toDataset('name,city', '"Doe, Jane",Austin');

    expect(dataset.rows).toEqual([['Doe, Jane', 'Austin']]);
  });

  it('keeps a quoted line break inside its value', () => {
    const dataset = toDataset(
      'name,note',
      'Alice,"line one\nline two"',
      'Bob,ok'
    );

    expect(dataset.rows).toEqual([
      ['Alice', 'line one\nline two'],
      ['Bob', 'ok'],
    ]);
  });

  it('unescapes doubled quotes', () => {
    const dataset = toDataset('name,quote', 'Alice,"She said ""hi"""');

    expect(dataset.rows).toEqual([['Alice', 'She said "hi"']]);
  });

  it('records and removes a byte order mark', () => {
    const withMark = toDataset('\uFEFFname,age', 'Alice,34');
    const withoutMark = toDataset('name,age', 'Alice,34');

    expect(withMark.format.hasByteOrderMark).toBe(true);
    expect(headers(withMark)).toEqual(['name', 'age']);
    expect(withoutMark.format.hasByteOrderMark).toBe(false);
  });

  it('records CRLF line breaks and leaves no carriage return in values', () => {
    const outcome = parseCsv({
      text: 'name,age\r\nAlice,34\r\nBob,41\r\n',
      encoding: 'utf-8',
    });

    expect(outcome).toMatchObject({
      ok: true,
      dataset: {
        format: { lineBreak: '\r\n' },
        rows: [
          ['Alice', '34'],
          ['Bob', '41'],
        ],
      },
    });
  });

  it('records LF line breaks', () => {
    expect(toDataset('name,age', 'Alice,34').format.lineBreak).toBe('\n');
  });

  it('pads a short row with empty cells and records it', () => {
    const dataset = toDataset(
      'name,city,age',
      'Alice,Austin,34',
      'Bob',
      'Cara,Chicago,29'
    );

    expect(dataset.rows[1]).toEqual(['Bob', '', '']);
    expect(dataset.structure.raggedRows).toEqual([{ rowId: 1, cellCount: 1 }]);
  });

  it('adds an unnamed column for a long row and records it', () => {
    const dataset = toDataset('name,age', 'Alice,34', 'Bob,41,extra');

    expect(headers(dataset)).toEqual(['name', 'age', '']);
    expect(dataset.rows).toEqual([
      ['Alice', '34', ''],
      ['Bob', '41', 'extra'],
    ]);
    expect(dataset.structure).toMatchObject({
      headerCellCount: 2,
      raggedRows: [{ rowId: 1, cellCount: 3 }],
    });
  });

  it('keeps empty and repeated headers, keyed by position', () => {
    const dataset = toDataset('name,,name', 'Alice,34,Al');

    expect(dataset.columns).toEqual([
      { key: 0, header: 'name' },
      { key: 1, header: '' },
      { key: 2, header: 'name' },
    ]);
  });

  it('keeps surrounding spaces in headers and values', () => {
    const dataset = toDataset(' name ,city', '  Alice ,Austin\u00A0');

    expect(headers(dataset)).toEqual([' name ', 'city']);
    expect(dataset.rows).toEqual([['  Alice ', 'Austin\u00A0']]);
  });

  it('keeps a row of empty cells, which is not a blank line', () => {
    const dataset = toDataset('name,age', ',', 'Alice,34');

    expect(dataset.rows).toEqual([
      ['', ''],
      ['Alice', '34'],
    ]);
    expect(dataset.structure.blankLinesSkipped).toBe(0);
  });

  it('skips zero-length lines and counts them, but not the final line break', () => {
    const dataset = toDataset('name,age', '', 'Alice,34', '', '', 'Bob,41', '');

    expect(dataset.rows).toEqual([
      ['Alice', '34'],
      ['Bob', '41'],
    ]);
    expect(dataset.structure.blankLinesSkipped).toBe(3);
  });

  it('gives each row its position as its id', () => {
    const dataset = toDataset('name', 'Alice', 'Bob', '', 'Cara,extra');

    expect(dataset.structure.raggedRows).toEqual([{ rowId: 2, cellCount: 2 }]);
  });

  it.each([
    { name: 'a header-only file', text: 'name,age' },
    { name: 'a header-only file ending in a line break', text: 'name,age\r\n' },
  ])('fails with noDataRows for $name', ({ text }) => {
    expect(parseCsv({ text, encoding: 'utf-8' })).toEqual({
      ok: false,
      reason: 'noDataRows',
    });
  });

  it.each([
    { name: 'empty input', text: '' },
    { name: 'only a byte order mark', text: '\uFEFF' },
    { name: 'only line breaks', text: '\n\n\n' },
  ])('fails with empty for $name', ({ text }) => {
    expect(parseCsv({ text, encoding: 'utf-8' })).toEqual({
      ok: false,
      reason: 'empty',
    });
  });

  it('keeps the encoding it was given', () => {
    const outcome = parseCsv({ text: 'name\nAlice', encoding: 'windows-1252' });

    expect(outcome).toMatchObject({
      ok: true,
      dataset: { format: { encoding: 'windows-1252' } },
    });
  });
});

function headers(dataset: Dataset): string[] {
  return dataset.columns.map((column) => column.header);
}
