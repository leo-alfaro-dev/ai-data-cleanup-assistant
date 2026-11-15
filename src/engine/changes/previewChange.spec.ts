import { describe, expect, it } from 'vitest';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { accept } from '@/engine/testing/accept';
import { cleanEveryCell } from '@/engine/testing/cleanEveryCell';
import { toDataset } from '@/engine/testing/toDataset';
import { watchRowReads } from '@/engine/testing/watchRowReads';
import type { Change } from './change';
import { MAX_PREVIEW_EXAMPLES } from './changePreview';
import { previewChange } from './previewChange';

const NAME = toColumnKey(0);
const STATE = toColumnKey(1);
const JOINED = toColumnKey(2);

const people = toDataset(
  'name,state,joined',
  'Ann,CA,2024/03/04',
  'Bob, CA ,2024-03-04',
  'Cy,Calif.,03/04/2024',
  'Di,California,"Mar 4, 2024"',
  'Ed,CA,N/A',
  'Flo,calif,2024/03/05'
);

describe('previewChange, rules on a column', () => {
  it('counts the cells a mapping changes, and lists distinct before and after pairs, most frequent first, ties in file order', () => {
    const preview = previewChange({
      dataset: people,
      change: {
        kind: 'mapValues',
        column: STATE,
        groups: [
          { canonical: 'California', variants: ['CA', 'Calif.', 'calif'] },
        ],
      },
    });

    expect(preview.counts).toEqual({ cells: 5, rows: 5, removedRows: 0 });
    expect(preview.examples).toEqual([
      { before: 'CA', after: 'California', cells: 2 },
      { before: ' CA ', after: 'California', cells: 1 },
      { before: 'Calif.', after: 'California', cells: 1 },
      { before: 'calif', after: 'California', cells: 1 },
    ]);
  });

  it('counts only the cells a trim changes', () => {
    const preview = previewChange({
      dataset: people,
      change: { kind: 'trimWhitespace', column: STATE },
    });

    expect(preview.counts).toEqual({ cells: 1, rows: 1, removedRows: 0 });
    expect(preview.examples).toEqual([
      { before: ' CA ', after: 'CA', cells: 1 },
    ]);
  });

  it('leaves ambiguous dates, dates already in the format and other text out', () => {
    const preview = previewChange({
      dataset: people,
      change: {
        kind: 'standardizeDates',
        column: JOINED,
        format: 'YYYY-MM-DD',
      },
    });

    expect(preview.counts).toEqual({ cells: 3, rows: 3, removedRows: 0 });
    expect(preview.examples).toEqual([
      { before: '2024/03/04', after: '2024-03-04', cells: 1 },
      { before: 'Mar 4, 2024', after: '2024-03-04', cells: 1 },
      { before: '2024/03/05', after: '2024-03-05', cells: 1 },
    ]);
  });

  it('finds nothing to report when the rule changes no cell', () => {
    const preview = previewChange({
      dataset: people,
      change: {
        kind: 'mapValues',
        column: STATE,
        groups: [{ canonical: 'Texas', variants: ['TX'] }],
      },
    });

    expect(preview).toEqual({
      counts: { cells: 0, rows: 0, removedRows: 0 },
      examples: [],
    });
  });

  it('keeps the most frequent pairs when more than the cap are distinct', () => {
    const values = Array.from({ length: 15 }, (_, index) => ` v${index} `);
    const dataset = toDataset('name', ...values, ' v14 ', ' v14 ');

    const preview = previewChange({
      dataset,
      change: { kind: 'trimWhitespace', column: NAME },
    });

    expect(preview.counts.cells).toBe(17);
    expect(preview.examples).toHaveLength(MAX_PREVIEW_EXAMPLES);
    expect(preview.examples[0]).toEqual({
      before: ' v14 ',
      after: 'v14',
      cells: 3,
    });
    expect(preview.examples.slice(1).map(({ before }) => before)).toEqual(
      values.slice(0, MAX_PREVIEW_EXAMPLES - 1)
    );
  });

  it('agrees with cleaning every cell of the dataset with the change accepted', () => {
    const change: Change = {
      kind: 'mapValues',
      column: STATE,
      groups: [{ canonical: 'California', variants: ['CA', 'Calif.'] }],
    };
    const cleaned = cleanEveryCell({
      dataset: people,
      accepted: [accept({ issue: 'issue', change })],
    });
    const changedCells = cleaned.flat().filter((cell) => cell.isChanged);

    expect(previewChange({ dataset: people, change }).counts.cells).toBe(
      changedCells.length
    );
  });
});

describe('previewChange, rows named by the change', () => {
  it('counts the removals of a duplicate group, which change no cell', () => {
    const preview = previewChange({
      dataset: people,
      change: {
        kind: 'dropDuplicateRows',
        mode: 'exact',
        groups: [
          [toRowId(0), toRowId(1)],
          [toRowId(4), toRowId(5), toRowId(2)],
        ],
      },
    });

    expect(preview).toEqual({
      counts: { cells: 0, rows: 0, removedRows: 3 },
      examples: [],
    });
  });

  it('counts each removed row once', () => {
    const preview = previewChange({
      dataset: people,
      change: {
        kind: 'removeRows',
        rows: [toRowId(3), toRowId(3), toRowId(5)],
      },
    });

    expect(preview.counts).toEqual({ cells: 0, rows: 0, removedRows: 2 });
  });

  it('counts a row once however many of its cells change, and skips values equal to the original', () => {
    const preview = previewChange({
      dataset: people,
      change: {
        kind: 'setCells',
        cells: [
          { rowId: toRowId(0), column: NAME, value: 'Alice' },
          { rowId: toRowId(0), column: STATE, value: 'California' },
          { rowId: toRowId(2), column: NAME, value: 'Cy' },
          { rowId: toRowId(4), column: NAME, value: 'Edward' },
          { rowId: toRowId(0), column: NAME, value: 'Al' },
        ],
      },
    });

    expect(preview.counts).toEqual({ cells: 3, rows: 2, removedRows: 0 });
    expect(preview.examples).toEqual([
      { before: 'Ann', after: 'Alice', cells: 1 },
      { before: 'CA', after: 'California', cells: 1 },
      { before: 'Ed', after: 'Edward', cells: 1 },
    ]);
  });

  it('lists one value separately for each different value it becomes, in file order whatever order the change lists its cells', () => {
    const preview = previewChange({
      dataset: people,
      change: {
        kind: 'setCells',
        cells: [
          { rowId: toRowId(0), column: STATE, value: 'California' },
          { rowId: toRowId(4), column: STATE, value: 'Calif.' },
          { rowId: toRowId(0), column: NAME, value: 'Alice' },
        ],
      },
    });

    expect(preview.examples).toEqual([
      { before: 'Ann', after: 'Alice', cells: 1 },
      { before: 'CA', after: 'California', cells: 1 },
      { before: 'CA', after: 'Calif.', cells: 1 },
    ]);
  });

  it('counts the cells a merge fills in the kept row and the rows it removes', () => {
    const preview = previewChange({
      dataset: people,
      change: {
        kind: 'mergeRows',
        keep: toRowId(0),
        remove: [toRowId(1)],
        values: [
          { column: NAME, from: toRowId(1) },
          { column: STATE, from: toRowId(1) },
          { column: JOINED, from: toRowId(0) },
        ],
      },
    });

    expect(preview.counts).toEqual({ cells: 2, rows: 1, removedRows: 1 });
    expect(preview.examples).toEqual([
      { before: 'Ann', after: 'Bob', cells: 1 },
      { before: 'CA', after: ' CA ', cells: 1 },
    ]);
  });
});

describe('previewChange, the rows it reads', () => {
  it('walks a column rule once over every row', () => {
    const { dataset, reads } = watchRowReads(people);

    previewChange({
      dataset,
      change: { kind: 'trimWhitespace', column: STATE },
    });

    expect([...reads].sort()).toEqual(['0', '1', '2', '3', '4', '5', 'length']);
  });

  it('reads only the rows a row-specific change names', () => {
    const { dataset, reads } = watchRowReads(people);

    previewChange({
      dataset,
      change: {
        kind: 'setCells',
        cells: [
          { rowId: toRowId(4), column: NAME, value: 'Edward' },
          { rowId: toRowId(0), column: STATE, value: 'California' },
        ],
      },
    });

    expect([...new Set(reads)].sort()).toEqual(['0', '4']);
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
    'reads no row to preview $name',
    ({ change }) => {
      const { dataset, reads } = watchRowReads(people);

      previewChange({ dataset, change });

      expect(reads).toEqual([]);
    }
  );

  it('never mutates the dataset', () => {
    const before = structuredClone(people);

    previewChange({
      dataset: people,
      change: { kind: 'trimWhitespace', column: STATE },
    });
    previewChange({
      dataset: people,
      change: { kind: 'removeRows', rows: [toRowId(1)] },
    });

    expect(people).toEqual(before);
  });
});
