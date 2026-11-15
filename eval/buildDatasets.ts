import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { serializeTruth } from './corrupt/serializeTruth';
import { buildCustomerDataset } from './generate/buildCustomerDataset';
import { CUSTOMERS_SEED } from './generate/customerDatasetSettings';

function main(): void {
  const { csv, truth, rows } = buildCustomerDataset({ seed: CUSTOMERS_SEED });

  writeOutput({ path: 'eval/datasets/customers.csv', content: csv });
  writeOutput({
    path: 'eval/datasets/customers.truth.json',
    content: serializeTruth(truth),
  });
  writeOutput({ path: 'public/samples/customers.csv', content: csv });

  console.log(
    `${rows.length} rows, ${truth.errors.length} planted errors, seed ${CUSTOMERS_SEED}`
  );
}

function writeOutput({
  path,
  content,
}: {
  path: string;
  content: string;
}): void {
  const target = resolve(process.cwd(), path);

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  console.log(`wrote ${path}`);
}

main();
