import { logger } from './logger.js';

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  name: string;
  /** Number of failures before opening the circuit. Default: 5 */
  failureThreshold?: number;
  /** Time in ms before attempting to half-open from open state. Default: 30_000 */
  resetTimeoutMs?: number;
}

/**
 * Simple circuit breaker.
 *
 * States:
 *   closed   → normal operation; failures counted
 *   open     → fast-fail; no calls attempted until resetTimeoutMs elapses
 *   half-open→ one probe call allowed; success → closed, failure → open
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(opts: CircuitBreakerOptions) {
    this.name = opts.name;
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.resetTimeoutMs = opts.resetTimeoutMs ?? 30_000;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'half-open';
        logger.info({ name: this.name }, 'Circuit breaker: probing (half-open)');
      } else {
        throw new Error(`Service '${this.name}' is temporarily unavailable (circuit open)`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state !== 'closed') {
      logger.info({ name: this.name }, 'Circuit breaker: closed (recovered)');
    }
    this.state = 'closed';
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold && this.state !== 'open') {
      this.state = 'open';
      logger.warn(
        { name: this.name, failures: this.failureCount },
        'Circuit breaker: opened',
      );
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Shared singleton circuit breakers
export const aiCircuitBreaker = new CircuitBreaker({
  name: 'gemini-ai',
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
});

export const dbCircuitBreaker = new CircuitBreaker({
  name: 'database',
  failureThreshold: 10,
  resetTimeoutMs: 15_000,
});
