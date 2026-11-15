import type { Customer } from '../generate/customer';
import type { CustomerColumn } from '../generate/customerColumns';
import type { Random } from '../generate/random';
import type { PlantedKind } from './plantedKind';
import type { PlantedError } from './truth';

type ValueCategory = Exclude<PlantedError['category'], 'duplicate'>;

export type ValueCorruption = {
  label: {
    [Category in ValueCategory]: {
      category: Category;
      kind: PlantedKind<Category>;
    };
  }[ValueCategory];
  rate: number;
  appliesTo?: (customer: Customer) => boolean;
  corrupt(args: { customer: Customer; random: Random }): {
    column: CustomerColumn;
    corruptedValue: string;
  };
};
