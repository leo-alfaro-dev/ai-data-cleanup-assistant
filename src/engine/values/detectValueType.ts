import { isBlank } from './isBlank';
import { parseDate } from './parseDate';
import { parseNumber } from './parseNumber';
import type { ValueType } from './valueType';

export function detectValueType(value: string): ValueType {
  if (isBlank(value)) return 'empty';

  const trimmed = value.trim();
  if (parseNumber(trimmed) !== null) {
    const hasDecimalPart = trimmed.includes('.');
    return hasDecimalPart ? 'decimal' : 'integer';
  }
  if (parseDate(trimmed) !== null) return 'date';
  if (BOOLEAN.test(trimmed)) return 'boolean';
  if (EMAIL.test(trimmed)) return 'email';
  if (URL_LIKE.test(trimmed)) return 'url';

  const isPhone = PHONE.test(trimmed) && !SEPARATED_DATE_SHAPE.test(trimmed);
  return isPhone ? 'phone' : 'text';
}

const BOOLEAN = /^(?:true|false|yes|no)$/i;

const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

const URL_LIKE = /^(?:https?:\/\/|www\.)\S+$/i;

const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

const PHONE = new RegExp(
  `^(?=[+(\\d])\\+?(?:[\\s().-]*\\d){${MIN_PHONE_DIGITS},${MAX_PHONE_DIGITS}}[\\s().-]*$`
);

// Dates in a layout parseDate rejects (03-04-2024, 2024-02-30) look like phones; they are text.
const SEPARATED_DATE_SHAPE = /^\d{1,4}[-./]\d{1,2}[-./]\d{1,4}$/;
