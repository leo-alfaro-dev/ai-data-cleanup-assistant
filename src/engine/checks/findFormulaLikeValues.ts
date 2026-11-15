import type { ColumnKey, RowId } from '@/engine/dataset/dataset';
import { toRowId } from '@/engine/dataset/toRowId';
import type { Issue } from '@/engine/issues/issue';
import { toIssueId } from '@/engine/issues/toIssueId';
import type { FormulaTrigger } from '@/engine/values/formulaTrigger';
import { FORMULA_TRIGGERS } from '@/engine/values/formulaTrigger';
import { readFormulaTrigger } from '@/engine/values/readFormulaTrigger';
import type { Check } from './check';
import { toCheckId } from './toCheckId';

const id = toCheckId('formula-like-values');

type Tally = { rows: RowId[]; triggers: Set<FormulaTrigger> };

export const findFormulaLikeValues: Check = {
  id,
  category: 'suspicious',
  find({ dataset }) {
    const tallies = new Map<ColumnKey, Tally>();

    dataset.rows.forEach((row, index) => {
      for (const { key } of dataset.columns) {
        const trigger = readFormulaTrigger(row[key] ?? '');
        if (trigger === null) continue;

        const tally = tallies.get(key) ?? {
          rows: [],
          triggers: new Set<FormulaTrigger>(),
        };
        tallies.set(key, tally);
        tally.rows.push(toRowId(index));
        tally.triggers.add(trigger);
      }
    });

    return dataset.columns.flatMap(({ key }): Issue[] => {
      const tally = tallies.get(key);
      if (!tally) return [];

      return [
        {
          id: toIssueId(`${id}:${key}`),
          category: 'suspicious',
          source: 'check',
          confidence: 'high',
          rows: tally.rows,
          column: key,
          suggestion: null,
          details: {
            kind: 'formulaLikeValues',
            leadingCharacters: FORMULA_TRIGGERS.filter((trigger) =>
              tally.triggers.has(trigger)
            ),
          },
        },
      ];
    });
  },
};
