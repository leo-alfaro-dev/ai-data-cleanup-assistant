import { MAX_PHONE_DIGITS, MIN_PHONE_DIGITS } from './detectValueType';
import { isBlank } from './isBlank';
import { isPlaceholder } from './isPlaceholder';
import { toComparisonKey } from './toComparisonKey';

/**
 * The string two rows must share to agree on a cell, or null when the cell says nothing: blank,
 * a placeholder, or in a phone column anything a phone number does not look like. Phones are
 * compared by digits.
 */
export function toMatchKey({
  value,
  isPhone,
}: {
  value: string;
  isPhone: boolean;
}): string | null {
  if (isBlank(value) || isPlaceholder(value)) return null;
  if (!isPhone) return toComparisonKey(value);
  if (!PHONE_CHARACTERS.test(value)) return null;

  const digits = value.replace(NON_DIGITS, '');
  const isPhoneLength =
    digits.length >= MIN_PHONE_DIGITS && digits.length <= MAX_PHONE_DIGITS;

  return isPhoneLength ? digits : null;
}

const PHONE_CHARACTERS = /^[\d\s().+-]+$/;

const NON_DIGITS = /\D/g;
