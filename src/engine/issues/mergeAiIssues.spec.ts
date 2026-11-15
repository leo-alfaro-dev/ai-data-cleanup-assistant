import { describe, expect, it } from 'vitest';
import type { Change } from '@/engine/changes/change';
import type { ColumnKey } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue, IssueId, IssueSource } from './issue';
import { mergeAiIssues } from './mergeAiIssues';
import { toIssueId } from './toIssueId';

const state = toColumnKey(6);
const city = toColumnKey(5);

function issue({
  id,
  source,
  column,
  suggestion,
}: {
  id: string;
  source: IssueSource;
  column: ColumnKey | null;
  suggestion: Change | null;
}): Issue {
  return {
    id: toIssueId(id),
    category: 'inconsistent',
    source,
    confidence: 'high',
    rows: [],
    column,
    suggestion,
    details: { kind: 'blankRows' },
  };
}

function map(
  column: ReturnType<typeof toColumnKey>,
  ...groups: [string, string[]][]
): Change {
  return {
    kind: 'mapValues',
    column,
    groups: groups.map(([canonical, variants]) => ({ canonical, variants })),
  };
}

const casing = issue({
  id: 'casing-variants:6',
  source: 'check',
  column: state,
  suggestion: map(state, ['MN', ['mn']], ['CO', ['co']]),
});
const aiMinnesota = issue({
  id: 'normalize-values:6:0',
  source: 'ai',
  column: state,
  suggestion: map(state, ['MN', ['mn', 'Minn.', 'Minnesota']]),
});
const aiColorado = issue({
  id: 'normalize-values:6:1',
  source: 'ai',
  column: state,
  suggestion: map(state, ['CO', ['co', 'Colo.']]),
});

function merge({
  checkIssues,
  aiIssues,
  decided = [],
  rejected = [],
}: {
  checkIssues: Issue[];
  aiIssues: Issue[];
  decided?: IssueId[];
  rejected?: IssueId[];
}) {
  return mergeAiIssues({
    checkIssues,
    aiIssues,
    isDecided: (issueId) =>
      decided.includes(issueId) || rejected.includes(issueId),
    isRejected: (issueId) => rejected.includes(issueId),
  }).map(({ id }) => id);
}

describe('mergeAiIssues', () => {
  it('absorbs a check issue whose mapped values the AI issues map as well', () => {
    expect(
      merge({ checkIssues: [casing], aiIssues: [aiMinnesota, aiColorado] })
    ).toEqual(['normalize-values:6:0', 'normalize-values:6:1']);
  });

  it('keeps a check issue the AI covers only in part, so no value is left without a suggestion', () => {
    expect(merge({ checkIssues: [casing], aiIssues: [aiMinnesota] })).toEqual([
      'casing-variants:6',
      'normalize-values:6:0',
    ]);
  });

  it('never absorbs a check issue that is already decided', () => {
    expect(
      merge({
        checkIssues: [casing],
        aiIssues: [aiMinnesota, aiColorado],
        decided: [casing.id],
      })
    ).toEqual([
      'casing-variants:6',
      'normalize-values:6:0',
      'normalize-values:6:1',
    ]);
  });

  it('keeps a check issue whose one group the AI covers only in part', () => {
    const oneGroup = issue({
      id: 'casing-variants:6',
      source: 'check',
      column: state,
      suggestion: map(state, ['MN', ['mn', 'mN']]),
    });
    const aiOneSpelling = issue({
      id: 'normalize-values:6:0',
      source: 'ai',
      column: state,
      suggestion: map(state, ['MN', ['mn', 'Minn.']]),
    });

    expect(
      merge({ checkIssues: [oneGroup], aiIssues: [aiOneSpelling] })
    ).toEqual(['casing-variants:6', 'normalize-values:6:0']);
  });

  it('absorbs nothing once the AI issue is rejected, so the check issue comes back', () => {
    expect(
      merge({
        checkIssues: [casing],
        aiIssues: [aiMinnesota, aiColorado],
        rejected: [aiMinnesota.id, aiColorado.id],
      })
    ).toEqual([
      'casing-variants:6',
      'normalize-values:6:0',
      'normalize-values:6:1',
    ]);
  });

  it('absorbs by value, whatever canonical the AI chose', () => {
    const differentCanonical = issue({
      id: 'normalize-values:6:0',
      source: 'ai',
      column: state,
      suggestion: map(state, ['Minnesota', ['mn', 'MN']], ['Colorado', ['co']]),
    });

    expect(
      merge({ checkIssues: [casing], aiIssues: [differentCanonical] })
    ).toEqual(['normalize-values:6:0']);
  });

  it('compares values by their whitespace-normalized form', () => {
    const padded = issue({
      id: 'casing-variants:6',
      source: 'check',
      column: state,
      suggestion: map(state, ['MN', ['  mn ']]),
    });

    expect(merge({ checkIssues: [padded], aiIssues: [aiMinnesota] })).toEqual([
      'normalize-values:6:0',
    ]);
  });

  it('does not absorb a check issue on another column', () => {
    const cityCasing = issue({
      id: 'casing-variants:5',
      source: 'check',
      column: city,
      suggestion: map(city, ['Austin', ['austin']]),
    });

    expect(
      merge({ checkIssues: [cityCasing], aiIssues: [aiMinnesota] })
    ).toEqual(['casing-variants:5', 'normalize-values:6:0']);
  });

  it('absorbs the placeholder check issue when the AI names the same placeholders', () => {
    const placeholders = issue({
      id: 'placeholders:6',
      source: 'check',
      column: state,
      suggestion: map(state, ['', ['N/A', 'unknown']]),
    });
    const aiPlaceholders = issue({
      id: 'normalize-values:6:placeholders',
      source: 'ai',
      column: state,
      suggestion: map(state, ['', ['unknown', 'N/A', 'TBD']]),
    });

    expect(
      merge({ checkIssues: [placeholders], aiIssues: [aiPlaceholders] })
    ).toEqual(['normalize-values:6:placeholders']);
  });

  describe('merged rows', () => {
    const mergeOf = (keep: number, ...remove: number[]): Change => ({
      kind: 'mergeRows',
      keep: toRowId(keep),
      remove: remove.map(toRowId),
      values: [],
    });
    const checkMerge = issue({
      id: 'shared-identifiers:3',
      source: 'check',
      column: null,
      suggestion: mergeOf(3, 9),
    });

    it('absorbs a check merge of rows the AI merges as well, whichever row it keeps', () => {
      const aiMerge = issue({
        id: 'confirm-duplicates:3-9',
        source: 'ai',
        column: null,
        suggestion: mergeOf(9, 3),
      });

      expect(merge({ checkIssues: [checkMerge], aiIssues: [aiMerge] })).toEqual(
        ['confirm-duplicates:3-9']
      );
    });

    it('keeps a check merge when the AI merge of the same rows is rejected', () => {
      const aiMerge = issue({
        id: 'confirm-duplicates:3-9',
        source: 'ai',
        column: null,
        suggestion: mergeOf(9, 3),
      });

      expect(
        merge({
          checkIssues: [checkMerge],
          aiIssues: [aiMerge],
          rejected: [aiMerge.id],
        })
      ).toEqual(['shared-identifiers:3', 'confirm-duplicates:3-9']);
    });

    it('keeps a check merge of more rows than the AI pair covers', () => {
      const record = issue({
        id: 'shared-identifiers:3',
        source: 'check',
        column: null,
        suggestion: mergeOf(3, 9, 12),
      });
      const aiMerge = issue({
        id: 'confirm-duplicates:3-9',
        source: 'ai',
        column: null,
        suggestion: mergeOf(3, 9),
      });

      expect(merge({ checkIssues: [record], aiIssues: [aiMerge] })).toEqual([
        'shared-identifiers:3',
        'confirm-duplicates:3-9',
      ]);
    });

    it('keeps a check merge that is decided', () => {
      const aiMerge = issue({
        id: 'confirm-duplicates:3-9',
        source: 'ai',
        column: null,
        suggestion: mergeOf(3, 9),
      });

      expect(
        merge({
          checkIssues: [checkMerge],
          aiIssues: [aiMerge],
          decided: [checkMerge.id],
        })
      ).toEqual(['shared-identifiers:3', 'confirm-duplicates:3-9']);
    });

    it('keeps a check merge of other rows', () => {
      const aiMerge = issue({
        id: 'confirm-duplicates:5-6',
        source: 'ai',
        column: null,
        suggestion: mergeOf(5, 6),
      });

      expect(merge({ checkIssues: [checkMerge], aiIssues: [aiMerge] })).toEqual(
        ['shared-identifiers:3', 'confirm-duplicates:5-6']
      );
    });
  });

  describe('an AI assessment of one cell', () => {
    const assessed = (rowId: number, column: ColumnKey | null = state) => ({
      ...issue({
        id: `assess-suspicious-rows:${rowId}`,
        source: 'ai',
        column,
        suggestion: null,
      }),
      rows: [toRowId(rowId)],
      details: { kind: 'assessedRow' as const, reason: 'Odd.' },
    });
    const check = (rows: number[], column: ColumnKey | null = state) => ({
      ...issue({
        id: 'placeholders:6',
        source: 'check',
        column,
        suggestion: null,
      }),
      rows: rows.map(toRowId),
    });

    it('is left out where a check issue already covers that cell', () => {
      expect(
        merge({ checkIssues: [check([4, 9])], aiIssues: [assessed(9)] })
      ).toEqual(['placeholders:6']);
    });

    it('is left out where another AI issue already covers that cell', () => {
      const group = { ...aiMinnesota, rows: [toRowId(9), toRowId(10)] };

      expect(
        merge({ checkIssues: [], aiIssues: [group, assessed(9)] })
      ).toEqual(['normalize-values:6:0']);
    });

    it('stays when the AI issue that covers its cell was rejected', () => {
      const group = { ...aiMinnesota, rows: [toRowId(9), toRowId(10)] };

      expect(
        merge({
          checkIssues: [],
          aiIssues: [group, assessed(9)],
          rejected: [group.id],
        })
      ).toEqual(['normalize-values:6:0', 'assess-suspicious-rows:9']);
    });

    it('stays when no other issue covers its row in that column', () => {
      expect(
        merge({ checkIssues: [check([4, 9])], aiIssues: [assessed(5)] })
      ).toEqual(['placeholders:6', 'assess-suspicious-rows:5']);
      expect(
        merge({ checkIssues: [check([4, 9], city)], aiIssues: [assessed(9)] })
      ).toEqual(['placeholders:6', 'assess-suspicious-rows:9']);
    });

    it('stays when it is about the whole row', () => {
      expect(
        merge({
          checkIssues: [check([9], null)],
          aiIssues: [assessed(9, null)],
        })
      ).toEqual(['placeholders:6', 'assess-suspicious-rows:9']);
    });

    it('stays when it is decided', () => {
      expect(
        merge({
          checkIssues: [check([9])],
          aiIssues: [assessed(9)],
          decided: [toIssueId('assess-suspicious-rows:9')],
        })
      ).toEqual(['placeholders:6', 'assess-suspicious-rows:9']);
    });

    it('does not hide another assessment of the same cell, which covers nothing', () => {
      expect(
        merge({
          checkIssues: [],
          aiIssues: [
            assessed(9),
            { ...assessed(9), id: toIssueId('assess-suspicious-rows:9b') },
          ],
        })
      ).toEqual(['assess-suspicious-rows:9', 'assess-suspicious-rows:9b']);
    });
  });

  it('leaves check issues that are not value mappings alone', () => {
    const trim = issue({
      id: 'whitespace:6',
      source: 'check',
      column: state,
      suggestion: { kind: 'trimWhitespace', column: state },
    });
    const noSuggestion = issue({
      id: 'empty-cells:6',
      source: 'check',
      column: state,
      suggestion: null,
    });

    expect(
      merge({ checkIssues: [trim, noSuggestion], aiIssues: [aiMinnesota] })
    ).toEqual(['whitespace:6', 'empty-cells:6', 'normalize-values:6:0']);
  });

  it('returns the very same list when there are no AI issues', () => {
    const checkIssues = [casing];

    expect(
      mergeAiIssues({
        checkIssues,
        aiIssues: [],
        isDecided: () => false,
        isRejected: () => false,
      })
    ).toBe(checkIssues);
  });
});
