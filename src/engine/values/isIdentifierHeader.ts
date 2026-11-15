import { toHeaderWords } from './toHeaderWords';

export function isIdentifierHeader(header: string): boolean {
  return toHeaderWords(header).some((word) => IDENTIFIER_WORDS.has(word));
}

// Words that name a key. `number` and `code` are left out: a zip code or a house number is
// shared by many rows without being the same record.
const IDENTIFIER_WORDS: ReadonlySet<string> = new Set([
  'id',
  'ids',
  'identifier',
  'uuid',
  'guid',
  'sku',
]);
