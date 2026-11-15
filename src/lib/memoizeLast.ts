/**
 * Remembers the last result and returns it again while every named input is the same object.
 * Callers share the result and must not change it.
 */
export function memoizeLast<Inputs extends Record<string, unknown>, Result>(
  compute: (inputs: Inputs) => Result
): (inputs: Inputs) => Result {
  let last: { inputs: Inputs; result: Result } | null = null;

  return (inputs) => {
    const isSame =
      last !== null &&
      Object.keys(inputs).every((name) =>
        Object.is(inputs[name], last?.inputs[name])
      );
    if (last && isSame) return last.result;

    const result = compute(inputs);
    last = { inputs, result };

    return result;
  };
}
