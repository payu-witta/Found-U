import { logger } from './logger.js';
import { Redis } from 'ioredis';

let redis: Redis | null = null;
let initialized = false;

/**
 * Returns the shared Redis client, or null if REDIS_URL is not set.
 * The server operates fully without Redis (in-memory fallback for rate limiting).
 */
export function getRedis(): Redis | null {
  if (initialized) return redis;
  initialized = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.info('REDIS_URL not configured — using in-memory rate limiting');
    return null;
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 3_000,
      enableReadyCheck: false,
      lazyConnect: false,
    });

    redis.on('connect', () => logger.info('Redis connected'));
    redis.on('error', (err: Error) => logger.warn({ err }, 'Redis error'));
    redis.on('close', () => logger.warn('Redis connection closed'));
  } catch (err) {
    logger.warn({ err }, 'Failed to create Redis client — falling back to in-memory');
    redis = null;
  }

  return redis;
}

export function isRedisReady(): boolean {
  return redis?.status === 'ready';
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    initialized = false;
  }
}
