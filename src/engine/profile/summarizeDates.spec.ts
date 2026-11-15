import { describe, expect, it } from 'vitest';
import { summarizeDates } from './summarizeDates';

describe('summarizeDates', () => {
  it('counts each format that a value shows on its own', () => {
    const counts = new Map([
      ['2024-03-04', 3],
      ['2024/03/04', 1],
      ['13/04/2024', 2],
      ['04/13/2024', 1],
      ['Mar 4, 2024', 2],
      ['4 Mar 2024', 1],
    ]);

    expect(summarizeDates({ keys: [...counts.keys()], counts })).toEqual({
      formatCounts: {
        'YYYY-MM-DD': 3,
        'YYYY/MM/DD': 1,
        'MM/DD/YYYY': 1,
        'DD/MM/YYYY': 2,
        'MMM D, YYYY': 2,
        'D MMM YYYY': 1,
      },
      unknownOrderCount: 0,
      ambiguousCount: 0,
    });
  });

  it('counts a slash date that reads the same in both orders as unknown order only', () => {
    const counts = new Map([['04/04/2024', 2]]);
    const summary = summarizeDates({ keys: ['04/04/2024'], counts });

    expect(summary.unknownOrderCount).toBe(2);
    expect(summary.ambiguousCount).toBe(0);
    expect(Object.values(summary.formatCounts)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('counts a slash date that reads as two dates as unknown order and ambiguous', () => {
    const counts = new Map([
      ['03/04/2024', 3],
      ['04/04/2024', 1],
    ]);
    const summary = summarizeDates({ keys: [...counts.keys()], counts });

    expect(summary.unknownOrderCount).toBe(4);
    expect(summary.ambiguousCount).toBe(3);
  });

  it('leaves out keys that are not dates', () => {
    const counts = new Map([
      ['2024-03-04', 1],
      ['soon', 4],
    ]);
    const summary = summarizeDates({ keys: ['2024-03-04', 'soon'], counts });

    expect(summary.formatCounts['YYYY-MM-DD']).toBe(1);
    expect(summary.unknownOrderCount).toBe(0);
  });
});
