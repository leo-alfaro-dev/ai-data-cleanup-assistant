import type { ValueType } from './valueType';

export function isNumericType(type: ValueType | 'mixed' | undefined): boolean {
  return type === 'integer' || type === 'decimal';
}
