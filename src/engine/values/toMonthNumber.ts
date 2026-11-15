import { MONTH_ABBREVIATIONS, MONTH_NAMES } from './monthNames';

export function toMonthNumber(name: string): number | null {
  return MONTH_NUMBERS.get(name.toLowerCase()) ?? null;
}

const MONTH_NUMBERS: ReadonlyMap<string, number> = new Map(
  [MONTH_NAMES, MONTH_ABBREVIATIONS].flatMap((names) =>
    names.map((name, index): [string, number] => [
      name.toLowerCase(),
      index + 1,
    ])
  )
);
