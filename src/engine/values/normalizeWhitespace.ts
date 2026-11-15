export function normalizeWhitespace(value: string): string {
  if (!NEEDS_NORMALIZING.test(value)) return value;

  return value
    .trim()
    .replace(HORIZONTAL_WHITESPACE, ' ')
    .replace(SPACE_AROUND_LINE_BREAK, '$1');
}

// Every way a value can change: padding, a run or a non-space character of horizontal
// whitespace, or a space next to a line break.
const NEEDS_NORMALIZING =
  /^\s|\s$|[^\S\n\r\u2028\u2029 ]|  | [\n\r\u2028\u2029]|[\n\r\u2028\u2029] /;

const HORIZONTAL_WHITESPACE = /[^\S\n\r\u2028\u2029]+/g;

const SPACE_AROUND_LINE_BREAK = / ?([\n\r\u2028\u2029]) ?/g;
