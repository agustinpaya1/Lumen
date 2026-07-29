import { describe, expect, it, vi } from 'vitest';
import { RETRY_BACKOFF_DELAYS_MS, RETRY_MAX_ATTEMPTS } from '@core/constants';
import { sleep, withRetry } from './retry';

/**
 * Records every backoff wait instead of performing it, so the suite asserts the
 * schedule exactly and never spends real time sleeping.
 */
function createSleepSpy() {
  const waits: number[] = [];
  const sleepFn = vi.fn(async (ms: number) => {
    waits.push(ms);
  });
  return { sleepFn, waits };
}

/** A Supabase-shaped failure result (the non-throwing failure mode). */
const failure = (error: unknown) => ({ error });
/** A Supabase-shaped success result. */
const success = <T>(data: T) => ({ error: null, data });

describe('sleep', () => {
  it('resolves after the requested delay', async () => {
    vi.useFakeTimers();
    try {
      const resolved = vi.fn();
      const pending = sleep(1000).then(resolved);

      await vi.advanceTimersByTimeAsync(999);
      expect(resolved).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(resolved).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('withRetry', () => {
  it('returns immediately on first success, without sleeping or notifying', async () => {
    const { sleepFn, waits } = createSleepSpy();
    const onRetry = vi.fn();
    const operation = vi.fn().mockResolvedValue(success('ok'));

    const result = await withRetry(operation, { onRetry, sleepFn });

    expect(result).toEqual(success('ok'));
    expect(operation).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
    expect(waits).toEqual([]);
  });

  it('retries an { error } result and reports the attempt to onRetry', async () => {
    const { sleepFn, waits } = createSleepSpy();
    const onRetry = vi.fn();
    const operation = vi
      .fn()
      .mockResolvedValueOnce(failure('network down'))
      .mockResolvedValueOnce(success('ok'));

    const result = await withRetry(operation, { onRetry, sleepFn });

    expect(result).toEqual(success('ok'));
    expect(operation).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledExactlyOnceWith(1, RETRY_MAX_ATTEMPTS);
    expect(waits).toEqual([RETRY_BACKOFF_DELAYS_MS[0]]);
  });

  it('backs off in increasing order across two failures', async () => {
    const { sleepFn, waits } = createSleepSpy();
    const onRetry = vi.fn();
    const operation = vi
      .fn()
      .mockResolvedValueOnce(failure('e1'))
      .mockResolvedValueOnce(failure('e2'))
      .mockResolvedValueOnce(success('ok'));

    await withRetry(operation, { onRetry, sleepFn });

    expect(operation).toHaveBeenCalledTimes(3);
    expect(onRetry.mock.calls).toEqual([
      [1, RETRY_MAX_ATTEMPTS],
      [2, RETRY_MAX_ATTEMPTS],
    ]);
    // Exponential, in order — not merely "it waited twice".
    expect(waits).toEqual([RETRY_BACKOFF_DELAYS_MS[0], RETRY_BACKOFF_DELAYS_MS[1]]);
    expect(waits[1]).toBeGreaterThan(waits[0]);
  });

  it('rejects with the LAST error once attempts are exhausted', async () => {
    const { sleepFn } = createSleepSpy();
    const first = new Error('first');
    const last = new Error('last');
    const operation = vi
      .fn()
      .mockResolvedValueOnce(failure(first))
      .mockResolvedValueOnce(failure(new Error('middle')))
      .mockResolvedValueOnce(failure(last));

    // Identity, not just "it threw": the caller must see the most recent cause.
    await expect(withRetry(operation, { sleepFn })).rejects.toBe(last);
    expect(operation).toHaveBeenCalledTimes(RETRY_MAX_ATTEMPTS);
  });

  it('treats a thrown exception as retryable, same as an { error } result', async () => {
    const { sleepFn } = createSleepSpy();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce(failure('still bad'))
      .mockResolvedValueOnce(success('ok'));

    const result = await withRetry(operation, { sleepFn });

    expect(result).toEqual(success('ok'));
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('does not sleep after the final attempt', async () => {
    const { sleepFn, waits } = createSleepSpy();
    const operation = vi.fn().mockResolvedValue(failure('always'));

    await expect(withRetry(operation, { sleepFn })).rejects.toBeDefined();

    // Off-by-one guard: N attempts means N-1 waits, never N.
    expect(waits).toHaveLength(RETRY_MAX_ATTEMPTS - 1);
    expect(sleepFn).toHaveBeenCalledTimes(RETRY_MAX_ATTEMPTS - 1);
  });

  it('reuses the last configured delay when maxAttempts exceeds the delay list', async () => {
    const { sleepFn, waits } = createSleepSpy();
    const operation = vi.fn().mockResolvedValue(failure('always'));

    await expect(
      withRetry(operation, { maxAttempts: 5, delaysMs: [10, 20], sleepFn })
    ).rejects.toBeDefined();

    // Without the clamp, indexes 2 and 3 would be undefined -> a silent 0 ms wait.
    expect(waits).toEqual([10, 20, 20, 20]);
  });

  it('falls back to a zero wait when no delays are configured at all', async () => {
    const { sleepFn, waits } = createSleepSpy();
    const operation = vi.fn().mockResolvedValue(failure('always'));

    await expect(
      withRetry(operation, { maxAttempts: 3, delaysMs: [], sleepFn })
    ).rejects.toBeDefined();

    expect(waits).toEqual([0, 0]);
  });

  it('works when onRetry is omitted', async () => {
    const { sleepFn } = createSleepSpy();
    const operation = vi
      .fn()
      .mockResolvedValueOnce(failure('e'))
      .mockResolvedValueOnce(success('ok'));

    await expect(withRetry(operation, { sleepFn })).resolves.toEqual(success('ok'));
  });

  it('keeps retrying even if the onRetry UI callback throws', async () => {
    const { sleepFn } = createSleepSpy();
    const onRetry = vi.fn(() => {
      throw new Error('signal write failed');
    });
    const operation = vi
      .fn()
      .mockResolvedValueOnce(failure('e'))
      .mockResolvedValueOnce(success('ok'));

    // A failing progress indicator must never abort an in-flight upload.
    await expect(withRetry(operation, { onRetry, sleepFn })).resolves.toEqual(
      success('ok')
    );
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('treats both null and undefined error fields as success', async () => {
    const { sleepFn } = createSleepSpy();

    const withNull = vi.fn().mockResolvedValue({ error: null });
    const withUndefined = vi.fn().mockResolvedValue({ error: undefined });

    await expect(withRetry(withNull, { sleepFn })).resolves.toEqual({ error: null });
    await expect(withRetry(withUndefined, { sleepFn })).resolves.toEqual({
      error: undefined,
    });
    expect(withNull).toHaveBeenCalledTimes(1);
    expect(withUndefined).toHaveBeenCalledTimes(1);
  });
});
