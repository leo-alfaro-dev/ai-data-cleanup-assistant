export const CUSTOMER_COLUMNS = [
  'customer_id',
  'first_name',
  'last_name',
  'email',
  'phone',
  'city',
  'state',
  'country',
  'signup_date',
  'plan',
  'monthly_spend',
] as const;

export type CustomerColumn = (typeof CUSTOMER_COLUMNS)[number];

export const NON_ID_COLUMNS: readonly CustomerColumn[] =
  CUSTOMER_COLUMNS.filter((column) => column !== 'customer_id');
