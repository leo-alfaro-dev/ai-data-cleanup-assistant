import type { Customer } from '../generate/customer';
import type { CustomerColumn } from '../generate/customerColumns';
import { NON_ID_COLUMNS } from '../generate/customerColumns';
import type { Random } from '../generate/random';
import { introduceTypo } from './introduceTypo';
import type { PlantedKind } from './plantedKind';
import { toCasingVariants } from './toCasingVariants';
import { toPhoneLayouts } from './toPhoneLayouts';

export function createDuplicateCustomer({
  customer,
  kind,
  random,
}: {
  customer: Customer;
  kind: PlantedKind<'duplicate'>;
  random: Random;
}): Customer {
  switch (kind) {
    case 'exactCopy':
      return { ...customer };
    case 'nameTypo': {
      const column = random.pick(NAME_COLUMNS);

      return {
        ...customer,
        [column]: introduceTypo({ value: customer[column], random }),
      };
    }
    case 'casing': {
      const column = random.pick(CASING_COLUMNS);

      return {
        ...customer,
        [column]: random.pick(toCasingVariants(customer[column])),
      };
    }
    case 'phoneFormat':
      return {
        ...customer,
        phone: random.pick(toPhoneLayouts(customer.phone)),
      };
    case 'blankedField':
      return { ...customer, [random.pick(NON_ID_COLUMNS)]: '' };
  }
}

const NAME_COLUMNS: readonly CustomerColumn[] = ['first_name', 'last_name'];

const CASING_COLUMNS: readonly CustomerColumn[] = [
  'first_name',
  'last_name',
  'email',
];
