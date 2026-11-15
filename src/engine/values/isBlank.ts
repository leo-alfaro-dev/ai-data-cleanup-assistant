export function isBlank(value: string): boolean {
  return !NON_WHITESPACE.test(value);
}

const NON_WHITESPACE = /\S/;
