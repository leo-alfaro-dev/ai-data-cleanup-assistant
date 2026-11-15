/** A copy of the map with the entry set, or removed when the value is null. */
export function withEntry<Key, Value>({
  map,
  key,
  value,
}: {
  map: ReadonlyMap<Key, Value>;
  key: Key;
  value: Value | null;
}): ReadonlyMap<Key, Value> {
  const next = new Map(map);
  if (value === null) next.delete(key);
  else next.set(key, value);

  return next;
}
