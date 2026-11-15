import type { CustomerColumn } from '../generate/customerColumns';
import { toStateVariants } from '../generate/toStateVariants';
import { INNER_SPACING_SHARE, PLANTED_RATES } from './plantedRates';
import { toCasingVariants } from './toCasingVariants';
import { toMonthFirstDate } from './toMonthFirstDate';
import { toInnerSpaceVariants } from './toInnerSpaceVariants';
import { toPaddedVariants } from './toPaddedVariants';
import type { ValueCorruption } from './valueCorruption';

const CATEGORICAL_COLUMNS: readonly CustomerColumn[] = [
  'city',
  'state',
  'plan',
];

const TEXT_COLUMNS: readonly CustomerColumn[] = [
  'first_name',
  'last_name',
  'city',
];

export const INCONSISTENT_CORRUPTIONS: readonly ValueCorruption[] = [
  {
    label: { category: 'inconsistent', kind: 'stateVariant' },
    rate: PLANTED_RATES.inconsistent.stateVariant,
    corrupt: ({ customer, random }) => ({
      column: 'state',
      corruptedValue: random.pick(toStateVariants(customer.state)),
    }),
  },
  {
    label: { category: 'inconsistent', kind: 'casing' },
    rate: PLANTED_RATES.inconsistent.casing,
    corrupt: ({ customer, random }) => {
      const column = random.pick(CATEGORICAL_COLUMNS);

      return {
        column,
        corruptedValue: random.pick(toCasingVariants(customer[column])),
      };
    },
  },
  {
    label: { category: 'inconsistent', kind: 'spacing' },
    rate: PLANTED_RATES.inconsistent.spacing * (1 - INNER_SPACING_SHARE),
    corrupt: ({ customer, random }) => {
      const column = random.pick(TEXT_COLUMNS);

      return {
        column,
        corruptedValue: random.pick(toPaddedVariants(customer[column])),
      };
    },
  },
  {
    label: { category: 'inconsistent', kind: 'spacing' },
    rate: PLANTED_RATES.inconsistent.spacing * INNER_SPACING_SHARE,
    appliesTo: (customer) => customer.city.includes(' '),
    corrupt: ({ customer, random }) => ({
      column: 'city',
      corruptedValue: random.pick(toInnerSpaceVariants(customer.city)),
    }),
  },
  {
    label: { category: 'inconsistent', kind: 'dateFormat' },
    rate: PLANTED_RATES.inconsistent.dateFormat,
    corrupt: ({ customer }) => ({
      column: 'signup_date',
      corruptedValue: toMonthFirstDate(customer.signup_date),
    }),
  },
];
