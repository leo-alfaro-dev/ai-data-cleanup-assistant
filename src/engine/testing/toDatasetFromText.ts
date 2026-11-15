import type { Dataset, TextEncoding } from '@/engine/dataset/dataset';
import { parseCsv } from '@/engine/dataset/parseCsv';
import { deepFreeze } from '@/lib/deepFreeze';

export function toDatasetFromText({
  text,
  encoding = 'utf-8',
}: {
  text: string;
  encoding?: TextEncoding;
}): Dataset {
  const outcome = parseCsv({ text, encoding });
  if (!outcome.ok) throw new Error(`Expected a dataset, got ${outcome.reason}`);

  return deepFreeze(outcome.dataset);
}
