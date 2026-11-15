import { describe, expect, it } from 'vitest';
import type { AcceptedChange } from '@/engine/changes/acceptedChange';
import type { Change } from '@/engine/changes/change';
import { exportCleanedFiles } from '@/engine/export/exportCleanedFiles';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import { accept } from '@/engine/testing/accept';
import { toDataset } from '@/engine/testing/toDataset';
import { buildRecipe } from './buildRecipe';
import type { Recipe } from './recipe';
import { findColumnByRef } from './findColumnByRef';
import { parseRecipe } from './parseRecipe';
import { replayRecipe } from './replayRecipe';
import { serializeRecipe } from './serializeRecipe';
import { toColumnRef } from './toColumnRef';

const CREATED_AT = '2026-01-02T03:04:05.000Z';

function recipeOf({
  accepted,
  lines,
}: {
  accepted: AcceptedChange[];
  lines: string[];
}) {
  const dataset = toDataset(...lines);

  return buildRecipe({
    accepted,
    columns: dataset.columns,
    rowCount: dataset.rows.length,
    fileName: 'people.csv',
    createdAt: CREATED_AT,
  });
}

describe('buildRecipe', () => {
  const lines = ['name,city,city', ' Ada ,paris,Paris', 'Bo,Rome,Rome'];
  const city = toColumnKey(1);
  const trim: Change = { kind: 'trimWhitespace', column: toColumnKey(0) };

  it('keeps the rules and leaves out changes about particular rows', () => {
    const recipe = recipeOf({
      lines,
      accepted: [
        accept({ issue: 'a', change: trim }),
        accept({
          issue: 'b',
          change: {
            kind: 'setCells',
            cells: [{ rowId: toRowId(0), column: city, value: 'x' }],
          },
        }),
        accept({
          issue: 'c',
          change: {
            kind: 'mergeRows',
            keep: toRowId(0),
            remove: [toRowId(1)],
            values: [],
          },
        }),
        accept({
          issue: 'd',
          change: { kind: 'removeRows', rows: [toRowId(1)] },
        }),
        accept({
          issue: 'e',
          change: {
            kind: 'dropDuplicateRows',
            mode: 'exact',
            groups: [[toRowId(0), toRowId(1)]],
          },
        }),
      ],
    });

    expect(recipe.rules).toEqual([
      { kind: 'trimWhitespace', column: { header: 'name', occurrence: 1 } },
      { kind: 'dropDuplicateRows', mode: 'exact' },
    ]);
    expect(recipe).toMatchObject({
      version: 1,
      createdAt: CREATED_AT,
      source: {
        fileName: 'people.csv',
        rowCount: 2,
        columns: ['name', 'city', 'city'],
      },
    });
  });

  it('writes a column as its header text, with the occurrence for a repeated header', () => {
    const recipe = recipeOf({
      lines,
      accepted: [
        accept({
          issue: 'a',
          change: { kind: 'trimWhitespace', column: toColumnKey(1) },
        }),
        accept({
          issue: 'b',
          change: { kind: 'trimWhitespace', column: toColumnKey(2) },
        }),
      ],
    });

    expect(recipe.rules).toEqual([
      { kind: 'trimWhitespace', column: { header: 'city', occurrence: 1 } },
      { kind: 'trimWhitespace', column: { header: 'city', occurrence: 2 } },
    ]);
  });

  it('survives a round trip through JSON and the schema', () => {
    const recipe = recipeOf({
      lines,
      accepted: [
        accept({
          issue: 'a',
          change: {
            kind: 'mapValues',
            column: city,
            groups: [{ canonical: 'Paris', variants: ['paris'] }],
          },
        }),
        accept({
          issue: 'b',
          change: {
            kind: 'standardizeDates',
            column: city,
            format: 'YYYY-MM-DD',
          },
        }),
      ],
    });

    const parsed = parseRecipe(serializeRecipe(recipe));

    expect(parsed).toEqual({ ok: true, recipe });
  });
});

describe('column references', () => {
  const columns = toDataset('a,b,a', '1,2,3').columns;

  it('finds a column by header and occurrence, in any order', () => {
    const reordered = toDataset('b,a,a', '1,2,3').columns;
    const ref = toColumnRef({ columns, key: toColumnKey(2) });

    expect(ref).toEqual({ header: 'a', occurrence: 2 });
    expect(ref && findColumnByRef({ columns: reordered, ref })).toBe(2);
    expect(
      findColumnByRef({ columns, ref: { header: 'zzz', occurrence: 1 } })
    ).toBeNull();
    expect(
      findColumnByRef({ columns, ref: { header: 'b', occurrence: 2 } })
    ).toBeNull();
  });
});

describe('parseRecipe', () => {
  it.each([
    ['text that is not JSON', 'not json', 'notJson'],
    ['an object that is not a recipe', '{"rules": 3}', 'invalidRecipe'],
    [
      'a recipe of another version',
      '{"version": 2, "rules": []}',
      'unsupportedVersion',
    ],
    [
      'a rule of an unknown kind',
      JSON.stringify({
        version: 1,
        createdAt: CREATED_AT,
        source: { fileName: 'a.csv', rowCount: 1, columns: [] },
        rules: [{ kind: 'deleteEverything' }],
      }),
      'invalidRecipe',
    ],
  ])('rejects %s', (_name, text, reason) => {
    expect(parseRecipe(text)).toEqual({ ok: false, reason });
  });
});

describe('replayRecipe', () => {
  const lines = [
    'name,city,joined',
    ' Ada ,paris,2024-01-05',
    'Bo,PARIS,2024-02-10',
    'Cy,Rome,2024-03-01',
    'Cy,Rome,2024-03-01',
  ];

  function accepted(): AcceptedChange[] {
    return [
      accept({
        issue: 'whitespace:0',
        change: { kind: 'trimWhitespace', column: toColumnKey(0) },
      }),
      accept({
        issue: 'casing:1',
        change: {
          kind: 'mapValues',
          column: toColumnKey(1),
          groups: [{ canonical: 'Paris', variants: ['paris', 'PARIS'] }],
        },
      }),
      accept({
        issue: 'exact-duplicates',
        change: {
          kind: 'dropDuplicateRows',
          mode: 'exact',
          groups: [[toRowId(2), toRowId(3)]],
        },
      }),
    ];
  }

  it('reproduces the accepted rule changes when replayed on the source file', () => {
    const dataset = toDataset(...lines);
    const recipe = recipeOf({ lines, accepted: accepted() });

    const { issues, skipped } = replayRecipe({ dataset, recipe });

    expect(skipped).toEqual([]);
    expect(issues.map(({ suggestion }) => suggestion?.kind)).toEqual([
      'mapValues',
      'dropDuplicateRows',
      'trimWhitespace',
    ]);
    const replayedFiles = exportCleanedFiles({
      dataset,
      accepted: issues.flatMap(({ id, suggestion }) =>
        suggestion ? [{ issueId: id, change: suggestion }] : []
      ),
      recipeSource: { fileName: 'people.csv', createdAt: CREATED_AT },
    });
    const originalFiles = exportCleanedFiles({
      dataset,
      accepted: accepted(),
      recipeSource: { fileName: 'people.csv', createdAt: CREATED_AT },
    });
    expect(replayedFiles.csv).toBe(originalFiles.csv);
  });

  it('matches columns by header when the other file has them reordered', () => {
    const recipe = recipeOf({ lines, accepted: accepted() });
    const reordered = toDataset(
      'joined,city,name',
      '2024-01-05,paris, Ada ',
      '2024-02-10,PARIS,Bo'
    );

    const { issues, skipped } = replayRecipe({ dataset: reordered, recipe });

    expect(skipped).toEqual([
      { index: 1, rule: recipe.rules[1], reason: 'nothingToChange' },
    ]);
    expect(issues.map(({ column }) => column)).toEqual([1, 2]);
  });

  it('skips a rule whose column is missing and reports it, without failing the others', () => {
    const recipe = recipeOf({ lines, accepted: accepted() });
    const other = toDataset('name,town', ' Ada ,paris', 'Bo,Rome');

    const { issues, skipped } = replayRecipe({ dataset: other, recipe });

    expect(skipped).toEqual([
      { index: 0, rule: recipe.rules[0], reason: 'missingColumn' },
      { index: 1, rule: recipe.rules[1], reason: 'nothingToChange' },
    ]);
    expect(issues).toHaveLength(1);
  });

  it('recomputes the duplicate groups on the file it replays on', () => {
    const recipe = recipeOf({ lines, accepted: accepted() });
    const other = toDataset(
      'name,city,joined',
      'A,x,1',
      'B,y,2',
      'B,y,2',
      'B,y,2'
    );

    const { issues } = replayRecipe({ dataset: other, recipe });
    const drop = issues.find(
      ({ suggestion }) => suggestion?.kind === 'dropDuplicateRows'
    );

    expect(drop?.suggestion).toMatchObject({
      groups: [[toRowId(1), toRowId(2), toRowId(3)]],
    });
  });

  it('counts the cells it changes and the rows it removes', () => {
    const dataset = toDataset(...lines);
    const recipe = recipeOf({ lines, accepted: accepted() });

    const result = replayRecipe({ dataset, recipe });

    expect(result).toMatchObject({ cellsChanged: 3, rowsRemoved: 1 });
  });

  it('skips a rule that finds nothing to change', () => {
    const recipe = recipeOf({ lines, accepted: accepted() });
    const clean = toDataset('name,city,joined', 'Ada,Paris,2024-01-05');

    const { issues, skipped } = replayRecipe({ dataset: clean, recipe });

    expect(issues).toEqual([]);
    expect(skipped.map(({ reason }) => reason)).toEqual([
      'nothingToChange',
      'nothingToChange',
      'nothingToChange',
    ]);
  });

  it('orders ten or more rules as text-sorted ids would, so conflicts resolve as in the source file', () => {
    const rules = Array.from({ length: 12 }, (_, index) => ({
      kind: 'mapValues' as const,
      column: { header: 'city', occurrence: 1 },
      groups: [{ canonical: `Canonical ${index}`, variants: ['paris'] }],
    }));
    const recipe: Recipe = {
      version: 1,
      createdAt: CREATED_AT,
      source: { fileName: 'a.csv', rowCount: 1, columns: ['city'] },
      rules,
    };
    const dataset = toDataset('city', 'paris');

    const { issues } = replayRecipe({ dataset, recipe });
    const ids = issues.map(({ id }) => id);

    expect(ids).toEqual([...ids].sort());
    expect(ids[10]).toBe('recipe:0010');
  });

  it('files a rule that clears placeholders under Missing data', () => {
    const recipe: Recipe = {
      version: 1,
      createdAt: CREATED_AT,
      source: { fileName: 'a.csv', rowCount: 1, columns: ['city'] },
      rules: [
        {
          kind: 'mapValues',
          column: { header: 'city', occurrence: 1 },
          groups: [{ canonical: '', variants: ['N/A'] }],
        },
      ],
    };

    const { issues } = replayRecipe({
      dataset: toDataset('city', 'N/A', 'Rome'),
      recipe,
    });

    expect(issues.map(({ category }) => category)).toEqual(['missing']);
  });

  it('replays the normalized duplicate rule on rows that differ in spacing or case', () => {
    const recipe: Recipe = {
      version: 1,
      createdAt: CREATED_AT,
      source: { fileName: 'a.csv', rowCount: 1, columns: ['name'] },
      rules: [{ kind: 'dropDuplicateRows', mode: 'normalized' }],
    };

    const { issues } = replayRecipe({
      dataset: toDataset('name,city', 'Ada,Paris', ' ada ,paris', 'Bo,Rome'),
      recipe,
    });

    expect(issues[0]?.suggestion).toMatchObject({
      mode: 'normalized',
      groups: [[toRowId(0), toRowId(1)]],
    });
  });
});

describe('parseRecipe of a value that is not plain', () => {
  const withCanonical = (canonical: string) =>
    JSON.stringify({
      version: 1,
      createdAt: CREATED_AT,
      source: { fileName: 'a.csv', rowCount: 1, columns: ['city'] },
      rules: [
        {
          kind: 'mapValues',
          column: { header: 'city', occurrence: 1 },
          groups: [{ canonical, variants: ['x'] }],
        },
      ],
    });

  it('refuses a canonical value a spreadsheet would run as a formula', () => {
    expect(
      parseRecipe(withCanonical('=HYPERLINK("http://example.com")'))
    ).toEqual({
      ok: false,
      reason: 'unsafeValue',
    });
  });

  it('accepts an ordinary canonical value, and an empty one', () => {
    expect(parseRecipe(withCanonical('Paris')).ok).toBe(true);
    expect(parseRecipe(withCanonical('')).ok).toBe(true);
  });
});
