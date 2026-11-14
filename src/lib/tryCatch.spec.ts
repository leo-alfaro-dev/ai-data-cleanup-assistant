import { CancelablePromise } from 'easy-cancelable-promise';
import { describe, expect, it } from 'vitest';
import { tryCatch } from './tryCatch';

describe('tryCatch', () => {
  it('returns the result of a callback that succeeds', () => {
    expect(tryCatch(() => 42)).toEqual({ result: 42, error: null });
  });

  it('returns the error of a callback that throws', () => {
    const failure = new Error('boom');

    const { result, error } = tryCatch(() => {
      throw failure;
    });

    expect(result).toBeNull();
    expect(error).toBe(failure);
  });

  it('awaits a promise and returns its value', async () => {
    await expect(tryCatch(() => Promise.resolve('done'))).resolves.toEqual({
      result: 'done',
      error: null,
    });
  });

  it('returns the rejection of a promise as the error', async () => {
    const failure = new Error('rejected');

    const { result, error } = await tryCatch(() => Promise.reject(failure));

    expect(result).toBeNull();
    expect(error).toBe(failure);
  });

  it('wraps a reason that is not an Error and keeps it as the cause', async () => {
    const { error } = await tryCatch(() => Promise.reject('superseded'));

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('superseded');
    expect(error?.cause).toBe('superseded');
  });

  it('reports a canceled CancelablePromise as an error', async () => {
    const task = new CancelablePromise<string>(() => {});
    const outcome = tryCatch(() => task);

    task.cancel('superseded');

    const { result, error } = await outcome;

    expect(result).toBeNull();
    expect(error?.cause).toBe('superseded');
    expect(task.status).toBe('canceled');
  });
});
