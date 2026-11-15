/**
 * Remembers the result for each object it has seen, so a pure function of immutable data runs
 * once per object. The result is shared between callers and must not be changed.
 */
export function memoizeByReference<Key extends object, Result extends object>(
  compute: (key: Key) => Result
): (key: Key) => Result {
  const results = new WeakMap<Key, Result>();

  return (key) => {
    const remembered = results.get(key);
    if (remembered !== undefined) return remembered;

    const result = compute(key);
    results.set(key, result);

    return result;
  };
}
