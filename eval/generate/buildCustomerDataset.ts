import type { Row, SourceFormat } from '@/engine/dataset/dataset';
import { createCsvWriter } from '@/engine/export/createCsvWriter';
import { corruptDataset } from '../corrupt/corruptDataset';
import type { Truth } from '../corrupt/truth';
import { createRandom } from './createRandom';
import type { Customer } from './customer';
import { CLEAN_CUSTOMER_COUNT } from './customerDatasetSettings';
import { CUSTOMER_COLUMNS } from './customerColumns';
import { generateCustomers } from './generateCustomers';

export function buildCustomerDataset({ seed }: { seed: number }): {
  csv: string;
  truth: Truth;
  rows: Row[];
  cleanCustomers: Customer[];
} {
  const random = createRandom(seed);
  const cleanCustomers = generateCustomers({
    random,
    count: CLEAN_CUSTOMER_COUNT,
  });
  const { rows, errors } = corruptDataset({
    customers: cleanCustomers,
    random,
  });

  const writer = createCsvWriter(CSV_FORMAT);
  const csv = writer.toText([
    writer.toLine(CUSTOMER_COLUMNS),
    ...rows.map((row) => writer.toLine(row)),
  ]);

  return { csv, truth: { seed, errors }, rows, cleanCustomers };
}

const CSV_FORMAT: SourceFormat = {
  delimiter: ',',
  lineBreak: '\n',
  hasByteOrderMark: false,
  encoding: 'utf-8',
};
