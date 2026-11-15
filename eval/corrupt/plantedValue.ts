import type { CustomerColumn } from '../generate/customerColumns';
import type { ValueCorruption } from './valueCorruption';

export type PlantedValue = {
  customerIndex: number;
  label: ValueCorruption['label'];
  column: CustomerColumn;
  cleanValue: string;
  corruptedValue: string;
};
