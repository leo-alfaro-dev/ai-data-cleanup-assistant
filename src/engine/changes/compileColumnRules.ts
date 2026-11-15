import type { Column, ColumnKey } from '@/engine/dataset/dataset';
import { normalizeWhitespace } from '@/engine/values/normalizeWhitespace';
import type { ValueGroup } from './change';
import type { ChangeOrigin } from './changeOrigin';
import type { ColumnRules, DateRule, Replacement } from './cleanPlan';
import type { PlanEntry } from './planEntry';

export function compileColumnRules({
  entries,
  columns,
}: {
  entries: readonly PlanEntry[];
  columns: readonly Column[];
}): readonly (ColumnRules | null)[] {
  const dateRules = new Map<ColumnKey, DateRule>();
  const mappings = new Map<ColumnKey, Map<string, Replacement>>();
  const trimOrigins = new Map<ColumnKey, ChangeOrigin>();

  for (const { change, origin } of entries) {
    switch (change.kind) {
      case 'standardizeDates':
        if (!dateRules.has(change.column)) {
          dateRules.set(change.column, { format: change.format, origin });
        }
        break;
      case 'trimWhitespace':
        if (!trimOrigins.has(change.column)) {
          trimOrigins.set(change.column, origin);
        }
        break;
      case 'mapValues': {
        const mapping =
          mappings.get(change.column) ?? new Map<string, Replacement>();
        mappings.set(change.column, mapping);
        addGroups({ mapping, groups: change.groups, origin });
        break;
      }
    }
  }

  return columns.map(({ key }) => {
    const dateRule = dateRules.get(key) ?? null;
    const mapping = mappings.get(key) ?? null;
    const trimOrigin = trimOrigins.get(key) ?? null;
    if (!dateRule && !mapping && !trimOrigin) return null;

    return { dateRule, mapping, trimOrigin };
  });
}

function addGroups({
  mapping,
  groups,
  origin,
}: {
  mapping: Map<string, Replacement>;
  groups: readonly ValueGroup[];
  origin: ChangeOrigin;
}): void {
  for (const { canonical, variants } of groups) {
    const replacement = { value: canonical, origin };

    for (const variant of variants) {
      const key = normalizeWhitespace(variant);
      if (!mapping.has(key)) mapping.set(key, replacement);
    }
  }
}
