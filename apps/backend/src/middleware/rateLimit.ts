import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { env } from '../config/env.js';

// In-memory sliding window rate limiter.
// For production with multiple replicas, swap this for Redis-backed rate limiting.
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

function getClientKey(c: Parameters<MiddlewareHandler>[0]): string {
  // Prefer forwarded IP for load-balanced environments
  const forwarded = c.req.header('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : c.req.header('x-real-ip') ?? 'unknown';

  // If authenticated, also key by user ID to prevent shared-IP abuse
  const user = c.get('user') as { sub?: string } | undefined;
  return user?.sub ? `${ip}:${user.sub}` : ip;
}

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

export const rateLimit = (options: RateLimitOptions = {}): MiddlewareHandler => {
  const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const max = options.max ?? env.RATE_LIMIT_MAX_REQUESTS;
  const message = options.message ?? 'Too many requests, please try again later.';

  return async (c, next) => {
    const key = getClientKey(c);
    const now = Date.now();
    const resetAt = now + windowMs;

    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt };
      store.set(key, entry);
    } else {
      entry.count++;
    }

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      c.header('Retry-After', String(Math.ceil(windowMs / 1000)));
      throw new HTTPException(429, { message });
    }

    await next();
  };
};

export const uploadRateLimit = (): MiddlewareHandler =>
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.UPLOAD_RATE_LIMIT_MAX,
    message: 'Upload rate limit exceeded. Maximum 10 uploads per 15 minutes.',
  });
