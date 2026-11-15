import { toHeaderWords } from './toHeaderWords';

export function isNameHeader(header: string): boolean {
  const words = toHeaderWords(header);
  if (words.some((word) => COMPOUND_NAME_WORDS.has(word))) return true;

  const hasName = words.includes('name') || words.includes('names');
  if (!hasName) return false;

  return words.length === 1 || words.some((word) => PERSON_WORDS.has(word));
}

// `name` alone is too wide: `state_name` and `plan_name` are categories, not people.
const COMPOUND_NAME_WORDS: ReadonlySet<string> = new Set([
  'firstname',
  'lastname',
  'fullname',
  'givenname',
  'middlename',
  'surname',
  'forename',
  'fname',
  'lname',
]);

const PERSON_WORDS: ReadonlySet<string> = new Set([
  'first',
  'last',
  'middle',
  'full',
  'given',
  'family',
  'customer',
  'contact',
  'client',
  'person',
  'user',
  'owner',
  'employee',
  'patient',
  'student',
  'author',
]);
