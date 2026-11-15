export const VALUE_TYPES = [
  'empty',
  'integer',
  'decimal',
  'boolean',
  'date',
  'email',
  'phone',
  'url',
  'text',
] as const;

export type ValueType = (typeof VALUE_TYPES)[number];
