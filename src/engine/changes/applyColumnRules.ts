import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import { standardizeDate } from '@/engine/values/standardizeDate';
import type { ColumnRules, DateRule, Replacement } from './cleanPlan';

export function applyColumnRules({
  rules,
  base,
}: {
  rules: ColumnRules;
  base: string;
}): Replacement | null {
  const { dateRule, mapping, trimOrigin } = rules;

  const dated = dateRule ? applyDateRule({ dateRule, base }) : null;
  if (dated) return dated;

  if (!mapping && !trimOrigin) return null;

  const normalized = normalizeWhitespace(base);
  const mapped = mapping?.get(normalized);
  if (mapped && mapped.value !== base) return mapped;
  if (trimOrigin && normalized !== base) {
    return { value: normalized, origin: trimOrigin };
  }

  return null;
}

function applyDateRule({
  dateRule,
  base,
}: {
  dateRule: DateRule;
  base: string;
}): Replacement | null {
  const value = standardizeDate({ value: base, format: dateRule.format });
  if (value === null) return null;

  return { value, origin: dateRule.origin };
}
