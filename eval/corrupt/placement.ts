import type { Customer } from '../generate/customer';
import type { PlantedKind } from './plantedKind';

export type Placement =
  | { type: 'customer'; customerIndex: number; customer: Customer }
  | {
      type: 'copy';
      kind: PlantedKind<'duplicate'>;
      originalIndex: number;
      customer: Customer;
    };
