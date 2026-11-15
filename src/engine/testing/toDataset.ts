import type { Dataset } from '@/engine/dataset/dataset';
import { toDatasetFromText } from './toDatasetFromText';

export function toDataset(...lines: string[]): Dataset {
  return toDatasetFromText({ text: lines.join('\n') });
}
