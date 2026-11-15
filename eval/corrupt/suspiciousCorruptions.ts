import { parseNumber } from '@/engine/values/parseNumber';
import type { Customer } from '../generate/customer';
import { introduceDomainTypo } from './introduceDomainTypo';
import { PLANTED_RATES } from './plantedRates';
import type { ValueCorruption } from './valueCorruption';

export const SUSPICIOUS_CORRUPTIONS: readonly ValueCorruption[] = [
  {
    label: { category: 'suspicious', kind: 'spendTimes100' },
    rate: PLANTED_RATES.suspicious.spendTimes100,
    appliesTo: (customer) => readSpend(customer) > 0,
    corrupt: ({ customer }) => ({
      column: 'monthly_spend',
      corruptedValue: (readSpend(customer) * 100).toFixed(2),
    }),
  },
  {
    label: { category: 'suspicious', kind: 'negativeSpend' },
    rate: PLANTED_RATES.suspicious.negativeSpend,
    appliesTo: (customer) => readSpend(customer) > 0,
    corrupt: ({ customer }) => ({
      column: 'monthly_spend',
      corruptedValue: `-${customer.monthly_spend}`,
    }),
  },
  {
    label: { category: 'suspicious', kind: 'emailWithoutAt' },
    rate: PLANTED_RATES.suspicious.emailWithoutAt,
    corrupt: ({ customer, random }) => ({
      column: 'email',
      corruptedValue: random.pick([
        customer.email.replace('@', ''),
        customer.email.replace('@', '.'),
      ]),
    }),
  },
  {
    label: { category: 'suspicious', kind: 'emailDomainTypo' },
    rate: PLANTED_RATES.suspicious.emailDomainTypo,
    corrupt: ({ customer, random }) => ({
      column: 'email',
      corruptedValue: introduceDomainTypo({ email: customer.email, random }),
    }),
  },
  {
    label: { category: 'suspicious', kind: 'formulaLike' },
    rate: PLANTED_RATES.suspicious.formulaLike,
    corrupt: () => ({
      column: 'first_name',
      corruptedValue: FORMULA_LIKE_VALUE,
    }),
  },
];

const FORMULA_LIKE_VALUE =
  '=HYPERLINK("https://example.com/refund","Claim refund")';

function readSpend(customer: Customer): number {
  return parseNumber(customer.monthly_spend) ?? 0;
}
