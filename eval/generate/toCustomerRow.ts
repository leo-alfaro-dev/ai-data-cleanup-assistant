import type { Customer } from './customer';
import { CUSTOMER_COLUMNS } from './customerColumns';

export function toCustomerRow(customer: Customer): string[] {
  return CUSTOMER_COLUMNS.map((column) => customer[column]);
}
