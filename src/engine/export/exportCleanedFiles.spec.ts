import { describe, expect, it } from 'vitest';
import { accept } from '@/engine/testing/accept';
import { toDataset } from '@/engine/testing/toDataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { exportCleanedFiles } from './exportCleanedFiles';

const SOURCE = {
  fileName: 'people.csv',
  createdAt: '2026-01-02T03:04:05.000Z',
};

describe('exportCleanedFiles', () => {
  it('returns the input rows and an empty log when nothing is accepted', () => {
    const dataset = toDataset('name,city', 'Ada, Paris ', 'Bo,Rome');

    const files = exportCleanedFiles({
      dataset,
      accepted: [],
      recipeSource: SOURCE,
    });

    expect(files).toEqual({
      csv: 'name,city\nAda, Paris \nBo,Rome\n',
      changeLog: 'row,column,column_number,action,before,after,change,issue\n',
      recipe: expect.any(String),
      cellsChanged: 0,
      rowsRemoved: 0,
    });
    expect(JSON.parse(files.recipe)).toMatchObject({ rules: [] });
  });

  it('writes the cleaned values and one log line per changed cell and removed row', () => {
    const dataset = toDataset('name,city', 'Ada, Paris ', 'Bo,Rome', 'Bo,Rome');

    const files = exportCleanedFiles({
      dataset,
      accepted: [
        accept({
          issue: 'whitespace:1',
          change: { kind: 'trimWhitespace', column: toColumnKey(1) },
        }),
        accept({
          issue: 'exact-duplicates',
          change: {
            kind: 'dropDuplicateRows',
            mode: 'exact',
            groups: [[toRowId(1), toRowId(2)]],
          },
        }),
      ],
      recipeSource: SOURCE,
    });

    expect(files.csv).toBe('name,city\nAda,Paris\nBo,Rome\n');
    expect(files.changeLog.split('\n')).toEqual([
      'row,column,column_number,action,before,after,change,issue',
      '2,city,2,changed, Paris ,Paris,trimWhitespace,whitespace:1',
      '4,,,removed,,,dropDuplicateRows,exact-duplicates',
      '',
    ]);
    expect(files).toMatchObject({ cellsChanged: 1, rowsRemoved: 1 });
    expect(JSON.parse(files.recipe).rules).toEqual([
      { kind: 'dropDuplicateRows', mode: 'exact' },
      { kind: 'trimWhitespace', column: { header: 'city', occurrence: 1 } },
    ]);
  });

  it('does not count the encoding conversion as a changed cell', () => {
    const dataset = toDataset('name', 'Ada');

    const files = exportCleanedFiles({
      dataset: {
        ...dataset,
        format: { ...dataset.format, encoding: 'windows-1252' },
      },
      accepted: [],
      recipeSource: SOURCE,
    });

    expect(files.changeLog).toContain('converted');
    expect(files).toMatchObject({ cellsChanged: 0, rowsRemoved: 0 });
  });
});
