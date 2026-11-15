export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const ABBREVIATION_LENGTH = 3;

export const MONTH_ABBREVIATIONS: readonly string[] = MONTH_NAMES.map((name) =>
  name.slice(0, ABBREVIATION_LENGTH)
);
