export function deepFreeze<Value>(value: Value): Value {
  if (typeof value !== 'object' || value === null) return value;

  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);

  return value;
}
