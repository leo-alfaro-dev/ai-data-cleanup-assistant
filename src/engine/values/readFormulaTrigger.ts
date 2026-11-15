import { detectValueType } from './detectValueType';
import type { FormulaTrigger } from './formulaTrigger';
import { FORMULA_TRIGGERS } from './formulaTrigger';
import { isPlaceholder } from './isPlaceholder';
import { parseNumber } from './parseNumber';

// Padding is ignored because a spreadsheet may strip it before reading the value.
export function readFormulaTrigger(value: string): FormulaTrigger | null {
  const character = LEADING_TRIGGER.exec(value)?.[1];
  const trigger = FORMULA_TRIGGERS.find((candidate) => candidate === character);
  if (trigger === undefined) return null;

  const trimmed = value.trim();
  const isPlainValue =
    isSignedNumber(trimmed) ||
    isPlaceholder(trimmed) ||
    detectValueType(trimmed) === 'phone';

  return isPlainValue ? null : trigger;
}

const LEADING_TRIGGER = /^\s*([=+\-@])/;

// `parseNumber` has no leading plus and reads only English separators; `+5` and `-1.234,50` are
// numbers to a reader and harmless to a spreadsheet.
function isSignedNumber(trimmed: string): boolean {
  if (SIGNED_DIGITS.test(trimmed)) return true;

  const unsigned = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;

  return parseNumber(unsigned) !== null;
}

const SIGNED_DIGITS = /^[+-]\s?\d[\d\s.,]*%?$/;
