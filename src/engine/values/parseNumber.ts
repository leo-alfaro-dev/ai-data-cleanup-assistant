export function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!NUMBER_SHAPE.test(trimmed)) return null;

  const plain = Number(trimmed);
  const parsed = Number.isNaN(plain)
    ? Number(trimmed.replace(DECORATION, ''))
    : plain;

  if (!Number.isFinite(parsed)) return null;

  // Normalizes -0.
  return parsed === 0 ? 0 : parsed;
}

const CURRENCY_SYMBOLS = '$€£¥₹₩';
const CURRENCY = `[${CURRENCY_SYMBOLS}]`;

// Commas group in threes behind a first group of one to three digits that doesn't start with 0.
const WHOLE_PART = '(?:[1-9]\\d{0,2}(?:,\\d{3})+|\\d+)';

// A decimal part needs digits after the point: `.5` is a number, `5.` is not.
const MAGNITUDE = `(?:${WHOLE_PART}(?:\\.\\d+)?|\\.\\d+)`;

const NUMBER_SHAPE = new RegExp(
  `^(?:(?:-${CURRENCY}?|${CURRENCY}-?)?${MAGNITUDE}|-?${MAGNITUDE}%)$`
);

const DECORATION = new RegExp(`[,%${CURRENCY_SYMBOLS}]`, 'g');
