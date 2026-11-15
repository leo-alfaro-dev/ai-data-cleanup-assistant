import type { Customer } from '../generate/customer';
import type { Random } from '../generate/random';
import { INCONSISTENT_CORRUPTIONS } from './inconsistentCorruptions';
import { MISSING_CORRUPTIONS } from './missingCorruptions';
import type { PlantedValue } from './plantedValue';
import { SUSPICIOUS_CORRUPTIONS } from './suspiciousCorruptions';
import { toPlantedCount } from './toPlantedCount';
import type { ValueCorruption } from './valueCorruption';

// Each customer receives at most one error, and the customers in `excluded` none.
export function plantValues({
  customers,
  excluded,
  random,
}: {
  customers: readonly Customer[];
  excluded: ReadonlySet<number>;
  random: Random;
}): PlantedValue[] {
  let available = customers
    .map((customer, index) => ({ customer, index }))
    .filter(({ index }) => !excluded.has(index));
  const plantedValues: PlantedValue[] = [];

  for (const corruption of VALUE_CORRUPTIONS) {
    const chosen = random
      .sample({
        items: available.filter(({ customer }) =>
          corruption.appliesTo ? corruption.appliesTo(customer) : true
        ),
        count: toPlantedCount({
          rate: corruption.rate,
          total: customers.length,
        }),
      })
      .sort((first, second) => first.index - second.index);

    const claimed = new Set(chosen);
    available = available.filter((candidate) => !claimed.has(candidate));

    for (const { customer, index } of chosen) {
      const { column, corruptedValue } = corruption.corrupt({
        customer,
        random,
      });

      plantedValues.push({
        customerIndex: index,
        label: corruption.label,
        column,
        cleanValue: customer[column],
        corruptedValue,
      });
    }
  }

  return plantedValues;
}

const VALUE_CORRUPTIONS: readonly ValueCorruption[] = [
  ...INCONSISTENT_CORRUPTIONS,
  ...MISSING_CORRUPTIONS,
  ...SUSPICIOUS_CORRUPTIONS,
];
