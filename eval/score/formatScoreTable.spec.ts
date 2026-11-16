import { describe, expect, it } from 'vitest';
import type { IssueCategory } from '@/engine/issues/issue';
import type { CategoryScore } from './categoryScore';
import { formatScoreTable } from './formatScoreTable';
import { toCategoryScore } from './toCategoryScore';

const nothing = toCategoryScore({
  planted: 0,
  claimed: 0,
  correctClaims: 0,
  found: 0,
  suggested: 0,
  rightSuggestions: 0,
});

describe('formatScoreTable', () => {
  it('writes one row per category, in the brief words, under a header', () => {
    const lines = formatScoreTable(scores({})).split('\n');

    expect(lines).toHaveLength(5);
    expect(lines[0]).toMatch(/^Category\s+Planted\s+Found\s+Recall/);
    expect(lines.slice(1).map((line) => line.split('  ')[0]?.trim())).toEqual([
      'Duplicates',
      'Inconsistent values',
      'Missing data',
      'Suspicious records',
    ]);
  });

  it('shows ratios as percentages with one decimal, and null as a dash', () => {
    const table = formatScoreTable(
      scores({
        inconsistent: toCategoryScore({
          planted: 6,
          claimed: 4,
          correctClaims: 3,
          found: 5,
          suggested: 3,
          rightSuggestions: 3,
        }),
      })
    );
    const row = table
      .split('\n')
      .find((line) => line.startsWith('Inconsistent values'));

    expect(
      row
        ?.trim()
        .split(/\s{2,}/)
        .slice(1)
    ).toEqual(['6', '5', '83.3%', '4', '3', '75.0%', '3', '3', '100.0%']);
    expect(table.split('\n')[1]).toContain('n/a');
  });

  it('pads every line to the same width', () => {
    const widths = new Set(
      formatScoreTable(scores({}))
        .split('\n')
        .map((line) => line.length)
    );

    expect(widths.size).toBe(1);
  });
});

function scores(
  overrides: Partial<Record<IssueCategory, CategoryScore>>
): Record<IssueCategory, CategoryScore> {
  return {
    duplicate: nothing,
    inconsistent: nothing,
    missing: nothing,
    suspicious: nothing,
    ...overrides,
  };
}
