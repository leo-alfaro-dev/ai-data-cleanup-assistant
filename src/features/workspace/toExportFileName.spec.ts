import { describe, expect, it } from 'vitest';
import { toExportFileName } from './toExportFileName';

describe('toExportFileName', () => {
  it('puts the suffix before the csv extension', () => {
    expect(
      toExportFileName({ fileName: 'customers.csv', suffix: 'cleaned' })
    ).toBe('customers.cleaned.csv');
    expect(
      toExportFileName({ fileName: 'customers.csv', suffix: 'changes' })
    ).toBe('customers.changes.csv');
  });

  it('replaces any other extension, since the output is always csv', () => {
    expect(
      toExportFileName({ fileName: 'people.tsv', suffix: 'cleaned' })
    ).toBe('people.cleaned.csv');
  });

  it('keeps the dots inside the name', () => {
    expect(
      toExportFileName({ fileName: 'report.2024.q1.csv', suffix: 'cleaned' })
    ).toBe('report.2024.q1.cleaned.csv');
  });

  it('handles a name with no extension and a name that starts with a dot', () => {
    expect(toExportFileName({ fileName: 'people', suffix: 'cleaned' })).toBe(
      'people.cleaned.csv'
    );
    expect(toExportFileName({ fileName: '.hidden', suffix: 'cleaned' })).toBe(
      '.hidden.cleaned.csv'
    );
  });
});
