import type { Customer } from '../generate/customer';
import { FIRST_CUSTOMER_NUMBER, toCustomerId } from '../generate/customerId';
import { getAt } from '../generate/getAt';
import type { Random } from '../generate/random';
import { createDuplicateCustomer } from './createDuplicateCustomer';
import type { DuplicatePlan } from './duplicatePlan';
import { findPosition } from './findPosition';
import type { Placement } from './placement';

// A copy always lands after its original, because the app keeps the first row of a group.
export function placeRows({
  customers,
  plans,
  random,
}: {
  customers: readonly Customer[];
  plans: readonly DuplicatePlan[];
  random: Random;
}): Placement[] {
  const placements: Placement[] = customers.map((customer, customerIndex) => ({
    type: 'customer',
    customerIndex,
    customer,
  }));

  for (const { originalIndex, kind } of plans) {
    const originalPosition = findPosition({
      placements,
      customerIndex: originalIndex,
    });
    const original = getAt({ items: placements, index: originalPosition });
    const copyPosition = random.integer({
      min: originalPosition + 1,
      max: placements.length,
    });

    placements.splice(copyPosition, 0, {
      type: 'copy',
      kind,
      originalIndex,
      customer: createDuplicateCustomer({
        customer: original.customer,
        kind,
        random,
      }),
    });
  }

  return assignNewCustomerIds({
    placements,
    firstNumber: FIRST_CUSTOMER_NUMBER + customers.length,
  });
}

function assignNewCustomerIds({
  placements,
  firstNumber,
}: {
  placements: readonly Placement[];
  firstNumber: number;
}): Placement[] {
  let nextNumber = firstNumber;

  return placements.map((placement) => {
    const keepsId =
      placement.type === 'customer' || placement.kind === 'exactCopy';
    if (keepsId) return placement;

    const customerId = toCustomerId(nextNumber);
    nextNumber += 1;

    return {
      ...placement,
      customer: { ...placement.customer, customer_id: customerId },
    };
  });
}
