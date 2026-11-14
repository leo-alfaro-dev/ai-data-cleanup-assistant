export function tryCatch<Result>(
  callback: () => Result
): TryCatchOutcome<Result>;
export function tryCatch(callback: () => unknown): unknown {
  try {
    const result = callback();

    if (!isPromiseLike(result)) return { result, error: null };

    return Promise.resolve(result).then(
      (value) => ({ result: value, error: null }),
      (thrown: unknown) => ({ result: null, error: toError(thrown) })
    );
  } catch (thrown) {
    return { result: null, error: toError(thrown) };
  }
}

export type TryCatchResult<Result> =
  { result: Result; error: null } | { result: null; error: Error };

// `any` and `never` are assignable to PromiseLike, so both are settled first: a callback
// returning either runs synchronously. `0 extends 1 & Result` holds only for `any`.
type TryCatchOutcome<Result> = 0 extends 1 & Result
  ? TryCatchResult<Result>
  : [Result] extends [never]
    ? TryCatchResult<never>
    : [Result] extends [PromiseLike<infer Value>]
      ? Promise<TryCatchResult<Value>>
      : TryCatchResult<Result>;

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

function toError(thrown: unknown): Error {
  if (thrown instanceof Error) return thrown;

  return new Error(String(thrown), { cause: thrown });
}
