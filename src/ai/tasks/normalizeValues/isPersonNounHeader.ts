import { toHeaderWords } from '@/engine/values/toHeaderWords';

// A column headed `customer` holds customers' names. `isNameHeader` leaves such a header alone
// because the casing and duplicate checks must not treat an order's `customer` as a person's name.
export function isPersonNounHeader(header: string): boolean {
  const words = toHeaderWords(header);

  return words.length === 1 && PERSON_NOUNS.has(words[0] ?? '');
}

const PERSON_NOUNS: ReadonlySet<string> = new Set([
  'customer',
  'client',
  'person',
  'owner',
  'employee',
  'patient',
  'student',
  'author',
]);
