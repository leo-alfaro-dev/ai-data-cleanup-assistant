import { getAt } from '../generate/getAt';
import type { Random } from '../generate/random';
import type { DuplicatePlan } from './duplicatePlan';
import type { PlantedKind } from './plantedKind';
import { PLANTED_RATES, REPEATED_ORIGINAL_RATE } from './plantedRates';
import { toPlantedCount } from './toPlantedCount';

export function planDuplicates({
  customerCount,
  random,
}: {
  customerCount: number;
  random: Random;
}): DuplicatePlan[] {
  const kinds = random.shuffle(
    DUPLICATE_KINDS.flatMap((kind) =>
      Array.from(
        {
          length: toPlantedCount({
            rate: PLANTED_RATES.duplicate[kind],
            total: customerCount,
          }),
        },
        () => kind
      )
    )
  );
  const repeatedCount = toPlantedCount({
    rate: REPEATED_ORIGINAL_RATE,
    total: customerCount,
  });

  const firstCopies = random.sample({
    items: Array.from({ length: customerCount }, (_, index) => index),
    count: kinds.length - repeatedCount,
  });
  const originalIndexes = [
    ...firstCopies,
    ...random.sample({ items: firstCopies, count: repeatedCount }),
  ];

  return kinds.map((kind, position) => ({
    kind,
    originalIndex: getAt({ items: originalIndexes, index: position }),
  }));
}

const DUPLICATE_KINDS: readonly PlantedKind<'duplicate'>[] = [
  'exactCopy',
  'nameTypo',
  'casing',
  'phoneFormat',
  'blankedField',
];
