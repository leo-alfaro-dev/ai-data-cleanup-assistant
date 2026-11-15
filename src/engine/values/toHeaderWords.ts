export function toHeaderWords(header: string): string[] {
  return header
    .replace(CAMEL_CASE_BOUNDARY, '$1 $2')
    .toLowerCase()
    .split(NON_ALPHANUMERIC)
    .filter((word) => word !== '');
}

const CAMEL_CASE_BOUNDARY = /([a-z])([A-Z])/g;

const NON_ALPHANUMERIC = /[^a-z0-9]+/;
