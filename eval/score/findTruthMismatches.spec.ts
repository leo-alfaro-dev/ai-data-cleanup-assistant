import { describe, expect, it } from 'vitest';
import { toDataset } from '@/engine/testing/toDataset';
import { truthSchema } from '../corrupt/truth';
import { findTruthMismatches } from './findTruthMismatches';

const dataset = toDataset(
  'name,state',
  'Ann,California',
  'Bob,N/A',
  'Ann,California'
);

describe('findTruthMismatches', () => {
  it('finds nothing when every planted cell holds its corrupted value and every duplicate row exists', () => {
    const truth = truthSchema.parse({
      seed: 1,
      errors: [
        placeholder({ rowId: 1, corruptedValue: 'N/A' }),
        { category: 'duplicate', kind: 'exactCopy', original: 0, copy: 2 },
      ],
    });

    expect(findTruthMismatches({ truth, dataset })).toEqual([]);
  });

  it('finds nothing for a truth without errors', () => {
    const truth = truthSchema.parse({ seed: 1, errors: [] });

    expect(findTruthMismatches({ truth, dataset })).toEqual([]);
  });

  it('names a cell that holds another value than the planted one', () => {
    const truth = truthSchema.parse({
      seed: 1,
      errors: [placeholder({ rowId: 0, corruptedValue: 'N/A' })],
    });

    expect(findTruthMismatches({ truth, dataset })).toEqual([
      'Row 2, column 2 holds "California", not the planted "N/A".',
    ]);
  });

  it('shows the whitespace that makes two values differ', () => {
    const truth = truthSchema.parse({
      seed: 1,
      errors: [placeholder({ rowId: 1, corruptedValue: 'N/A ' })],
    });

    expect(findTruthMismatches({ truth, dataset })).toEqual([
      'Row 3, column 2 holds "N/A", not the planted "N/A ".',
    ]);
  });

  it('names a planted cell outside the file', () => {
    const truth = truthSchema.parse({
      seed: 1,
      errors: [
        placeholder({ rowId: 9, corruptedValue: 'N/A' }),
        placeholder({ rowId: 1, column: 5, corruptedValue: 'N/A' }),
      ],
    });

    expect(findTruthMismatches({ truth, dataset })).toEqual([
      'Row 11, column 2 is not in the file.',
      'Row 3, column 6 is not in the file.',
    ]);
  });

  it('names each duplicate row that is not in the file', () => {
    const truth = truthSchema.parse({
      seed: 1,
      errors: [
        { category: 'duplicate', kind: 'exactCopy', original: 0, copy: 7 },
        { category: 'duplicate', kind: 'nameTypo', original: 8, copy: 9 },
      ],
    });

    expect(findTruthMismatches({ truth, dataset })).toEqual([
      'A duplicate names row 9, which is not in the file.',
      'A duplicate names row 10, which is not in the file.',
      'A duplicate names row 11, which is not in the file.',
    ]);
  });

  it('names a cell that carries two planted errors', () => {
    const truth = truthSchema.parse({
      seed: 1,
      errors: [
        placeholder({ rowId: 1, corruptedValue: 'N/A' }),
        placeholder({ rowId: 1, corruptedValue: 'N/A' }),
      ],
    });

    expect(findTruthMismatches({ truth, dataset })).toEqual([
      'Row 3, column 2 carries more than one planted error.',
    ]);
  });
});

function placeholder({
  rowId,
  column = 1,
  corruptedValue,
}: {
  rowId: number;
  column?: number;
  corruptedValue: string;
}) {
  return {
    category: 'missing',
    kind: 'placeholder',
    rowId,
    column,
    cleanValue: 'Texas',
    corruptedValue,
  };
}
