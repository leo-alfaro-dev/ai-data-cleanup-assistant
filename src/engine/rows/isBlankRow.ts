import type { Row } from '@/engine/dataset/dataset';
import { isBlank } from '@/engine/values/isBlank';

export function isBlankRow(row: Row): boolean {
  return row.every(isBlank);
}
