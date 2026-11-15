import type { ValueType } from './valueType';

export function isNumericType(type: ValueType): boolean {
  return type === 'integer' || type === 'decimal';
}
