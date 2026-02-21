export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Base delay in ms before exponential backoff. Default: 500 */
  baseDelayMs?: number;
  /** Upper bound on delay in ms. Default: 10_000 */
  maxDelayMs?: number;
  /** Called before each retry with the attempt number (1-based) and the error. */
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULTS = { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 10_000 } as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff and full jitter.
 *
 * delay_n = min(baseDelayMs * 2ⁿ + rand(0, baseDelayMs), maxDelayMs)
 *
 * Throws the last error after all attempts are exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULTS, ...options };

  let lastError: Error = new Error('All retry attempts failed');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxAttempts - 1) break;

      options.onRetry?.(attempt + 1, lastError);

      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * baseDelayMs,
        maxDelayMs,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}
