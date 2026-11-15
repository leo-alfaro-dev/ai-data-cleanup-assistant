import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeText } from '@/engine/dataset/decodeText';
import { parseCsv } from '@/engine/dataset/parseCsv';
import { SAMPLE_ROW_COUNT } from './sampleFile';

describe('the demo sample', () => {
  it('has the number of rows the first screen states', () => {
    const parsed = parseCsv(
      decodeText(new Uint8Array(readFileSync('public/samples/customers.csv')))
    );

    expect(parsed.ok && parsed.dataset.rows.length).toBe(SAMPLE_ROW_COUNT);
  });
});
