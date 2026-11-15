import { readFileSync } from 'node:fs';
import type { Dataset } from '@/engine/dataset/dataset';
import { decodeText } from '@/engine/dataset/decodeText';
import { parseCsv } from '@/engine/dataset/parseCsv';
import { tryCatch } from '@/lib/tryCatch';

export function readDataset(path: string): Dataset {
  const { result: bytes, error } = tryCatch(() => readFileSync(path));
  if (error) throw new Error(`Cannot read ${path}. Run yarn eval:data first.`);

  const { text, encoding } = decodeText(bytes);
  const outcome = parseCsv({ text, encoding });
  if (!outcome.ok) {
    throw new Error(`${path} does not parse: ${outcome.reason}.`);
  }

  return outcome.dataset;
}
