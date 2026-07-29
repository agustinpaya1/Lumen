import { RETRY_BACKOFF_DELAYS_MS, RETRY_MAX_ATTEMPTS } from '@core/constants';

/** Anything Supabase-shaped: a result that reports failure through `error`. */
export interface Fallible {
  error: unknown;
}

/** Resolves after `ms` milliseconds. The default spacing between attempts. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  /** Total attempts, including the first. Defaults to RETRY_MAX_ATTEMPTS. */
  maxAttempts?: number;
  /** Backoff waits; entry `i` is used after attempt `i + 1`. */
  delaysMs?: readonly number[];
  /** Invoked before each backoff wait, for UI feedback. Never affects control flow. */
  onRetry?: (attemptNumber: number, maxAttempts: number) => void;
  /** Injectable for tests, so the suite never waits on real timers. */
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * Runs a Supabase operation up to `maxAttempts` times with exponential backoff,
 * so a flaky guest connection doesn't lose a capture. Both a thrown error and a
 * Supabase `{ error }` result count as a retryable failure; the last error is
 * rethrown once attempts are exhausted.
 *
 * Extracted from SupabaseService as a free function: the retry policy is pure
 * scheduling logic with no dependency on the Supabase client, which makes it
 * directly testable without mocking the network.
 *
 * @param operation Produces a fresh result on each attempt.
 * @returns The first result whose `error` is empty.
 */
export async function withRetry<T extends Fallible>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = RETRY_MAX_ATTEMPTS,
    delaysMs = RETRY_BACKOFF_DELAYS_MS,
    onRetry,
    sleepFn = sleep,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      if (!result.error) {
        return result;
      }
      lastError = result.error;
    } catch (error) {
      lastError = error;
    }

    // No wait after the final attempt — it would delay the rejection for nothing.
    if (attempt === maxAttempts) {
      break;
    }

    // A UI callback must never abort an in-flight upload, so its failures are
    // swallowed rather than propagated.
    try {
      onRetry?.(attempt, maxAttempts);
    } catch {
      /* deliberately ignored */
    }

    // Clamp: a maxAttempts larger than the configured delays reuses the last one
    // instead of silently degrading to a 0 ms wait via an undefined index.
    const wait = delaysMs[attempt - 1] ?? delaysMs[delaysMs.length - 1] ?? 0;
    await sleepFn(wait);
  }

  throw lastError;
}
