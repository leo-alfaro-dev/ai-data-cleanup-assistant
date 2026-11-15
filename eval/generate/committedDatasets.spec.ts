import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { serializeTruth } from '../corrupt/serializeTruth';
import { buildCustomerDataset } from './buildCustomerDataset';
import { buildSampleRecipe } from './buildSampleRecipe';
import { CUSTOMERS_SEED, NEXT_MONTH_SEED } from './customerDatasetSettings';

describe('committed customer datasets', () => {
  const built = buildCustomerDataset({ seed: CUSTOMERS_SEED });

  it('match the generator; run yarn eval:data after changing it', () => {
    expect(read('eval/datasets/customers.csv')).toBe(built.csv);
    expect(read('eval/datasets/customers.truth.json')).toBe(
      serializeTruth(built.truth)
    );
  });

  it('keep the next month sample and the sample recipe in step with the generator', () => {
    expect(read('public/samples/customers-next-month.csv')).toBe(
      buildCustomerDataset({ seed: NEXT_MONTH_SEED }).csv
    );
    expect(read('public/samples/customers.recipe.json')).toBe(
      buildSampleRecipe({ csv: built.csv, fileName: 'customers.csv' })
    );
  });

  it('give the sample file the same bytes as the evaluation file', () => {
    expect(read('public/samples/customers.csv')).toBe(
      read('eval/datasets/customers.csv')
    );
  });
});

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}
