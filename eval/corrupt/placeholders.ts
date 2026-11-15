import type { CustomerColumn } from '../generate/customerColumns';

export const PLACEHOLDERS = ['N/A', '-', 'unknown', 'TBD'] as const;

const PENDING_COLUMNS: readonly CustomerColumn[] = [
  'signup_date',
  'plan',
  'monthly_spend',
];

// "TBD" reads as a value still to come, so it only goes where one can be pending.
export function toPlaceholders(column: CustomerColumn): readonly string[] {
  if (PENDING_COLUMNS.includes(column)) return PLACEHOLDERS;

  return PLACEHOLDERS.filter((placeholder) => placeholder !== 'TBD');
}
