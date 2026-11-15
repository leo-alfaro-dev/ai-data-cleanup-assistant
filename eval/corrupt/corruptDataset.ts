import type { Row } from '@/engine/dataset/dataset';
import type { Customer } from '../generate/customer';
import type { Random } from '../generate/random';
import { toCustomerRow } from '../generate/toCustomerRow';
import { applyPlantedValues } from './applyPlantedValues';
import { placeRows } from './placeRows';
import { planDuplicates } from './planDuplicates';
import { plantValues } from './plantValues';
import { toPlantedErrors } from './toPlantedErrors';
import type { PlantedError } from './truth';

export function corruptDataset({
  customers,
  random,
}: {
  customers: readonly Customer[];
  random: Random;
}): { rows: Row[]; errors: PlantedError[] } {
  const plans = planDuplicates({ customerCount: customers.length, random });
  const plantedValues = plantValues({
    customers,
    excluded: new Set(plans.map((plan) => plan.originalIndex)),
    random,
  });

  const placements = placeRows({
    customers: applyPlantedValues({ customers, plantedValues }),
    plans,
    random,
  });

  return {
    rows: placements.map((placement) => toCustomerRow(placement.customer)),
    errors: toPlantedErrors({ placements, plantedValues }),
  };
}
