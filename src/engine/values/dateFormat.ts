export const DATE_FORMATS = [
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'MMM D, YYYY',
  'D MMM YYYY',
] as const;

export type DateFormat = (typeof DATE_FORMATS)[number];
