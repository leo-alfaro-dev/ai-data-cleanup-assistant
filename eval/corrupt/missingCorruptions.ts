import { NON_ID_COLUMNS } from '../generate/customerColumns';
import { toPlaceholders } from './placeholders';
import { PLANTED_RATES } from './plantedRates';
import type { ValueCorruption } from './valueCorruption';

export const MISSING_CORRUPTIONS: readonly ValueCorruption[] = [
  {
    label: { category: 'missing', kind: 'blank' },
    rate: PLANTED_RATES.missing.blank,
    corrupt: ({ random }) => ({
      column: random.pick(NON_ID_COLUMNS),
      corruptedValue: '',
    }),
  },
  {
    label: { category: 'missing', kind: 'placeholder' },
    rate: PLANTED_RATES.missing.placeholder,
    corrupt: ({ random }) => {
      const column = random.pick(NON_ID_COLUMNS);

      return {
        column,
        corruptedValue: random.pick(toPlaceholders(column)),
      };
    },
  },
];
