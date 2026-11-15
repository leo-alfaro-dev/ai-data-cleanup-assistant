import type { Customer } from '../generate/customer';
import type { PlantedValue } from './plantedValue';

export function applyPlantedValues({
  customers,
  plantedValues,
}: {
  customers: readonly Customer[];
  plantedValues: readonly PlantedValue[];
}): Customer[] {
  const valueByCustomer = new Map(
    plantedValues.map((planted): [number, PlantedValue] => [
      planted.customerIndex,
      planted,
    ])
  );

  return customers.map((customer, index) => {
    const planted = valueByCustomer.get(index);
    if (planted === undefined) return customer;

    return { ...customer, [planted.column]: planted.corruptedValue };
  });
}
