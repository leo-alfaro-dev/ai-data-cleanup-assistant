import type { ColumnKey } from '@/engine/dataset/dataset';
import { toColumnKey } from '@/engine/dataset/toColumnKey';
import type { CustomerColumn } from './customerColumns';
import { CUSTOMER_COLUMNS } from './customerColumns';

export function toCustomerColumnKey(column: CustomerColumn): ColumnKey {
  return toColumnKey(CUSTOMER_COLUMNS.indexOf(column));
}
