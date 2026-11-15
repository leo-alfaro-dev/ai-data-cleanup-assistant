import { describe, expect, it } from 'vitest';
import { decodeText } from '@/engine/dataset/decodeText';
import { parseCsv } from '@/engine/dataset/parseCsv';
import { serializeTruth } from '../corrupt/serializeTruth';
import { truthSchema } from '../corrupt/truth';
import { buildCustomerDataset } from './buildCustomerDataset';
import { CUSTOMER_COLUMNS } from './customerColumns';
import { CUSTOMERS_SEED } from './customerDatasetSettings';

describe('buildCustomerDataset', () => {
  const built = buildCustomerDataset({ seed: CUSTOMERS_SEED });

  it('gives identical bytes for the same seed', () => {
    const again = buildCustomerDataset({ seed: CUSTOMERS_SEED });

    expect(again.csv).toBe(built.csv);
    expect(serializeTruth(again.truth)).toBe(serializeTruth(built.truth));
  });

  it('gives different output for a different seed', () => {
    const other = buildCustomerDataset({ seed: CUSTOMERS_SEED + 1 });

    expect(other.csv).not.toBe(built.csv);
    expect(serializeTruth(other.truth)).not.toBe(serializeTruth(built.truth));
  });

  it('records the seed in the truth', () => {
    expect(built.truth.seed).toBe(CUSTOMERS_SEED);
  });

  it('writes a header and one line per row, ending with a line break', () => {
    const lines = built.csv.split('\n');

    expect(lines.at(0)).toBe(CUSTOMER_COLUMNS.join(','));
    expect(lines).toHaveLength(built.rows.length + 2);
    expect(lines.at(-1)).toBe('');
  });

  it('parses back to exactly the dirty rows, so truth ids match what the app reads', () => {
    const { text, encoding } = decodeText(new TextEncoder().encode(built.csv));
    const outcome = parseCsv({ text, encoding });
    if (!outcome.ok)
      throw new Error(`Expected a dataset, got ${outcome.reason}`);
    const { dataset } = outcome;

    expect(encoding).toBe('utf-8');
    expect(dataset.format).toEqual({
      delimiter: ',',
      lineBreak: '\n',
      hasByteOrderMark: false,
      encoding: 'utf-8',
    });
    expect(dataset.columns.map((column) => column.header)).toEqual(
      CUSTOMER_COLUMNS
    );
    expect(dataset.structure.raggedRows).toEqual([]);
    expect(dataset.structure.blankLinesSkipped).toBe(0);
    expect(dataset.rows).toEqual(built.rows);
  });

  it('keeps the invisible differences through the file', () => {
    expect(built.csv).toContain('\u00a0');
    expect(built.rows.flat().some((cell) => /^ | $/.test(cell))).toBe(true);
  });

  it('quotes the formula-like value, which holds commas and quotes', () => {
    expect(built.csv).toContain(
      '"=HYPERLINK(""https://example.com/refund"",""Claim refund"")"'
    );
  });

  it('serializes a truth that the schema reads back unchanged', () => {
    const json: unknown = JSON.parse(serializeTruth(built.truth));

    expect(truthSchema.parse(json)).toEqual(built.truth);
    expect(serializeTruth(built.truth).endsWith('}\n')).toBe(true);
  });
});
