import { lt, and, isNotNull } from 'drizzle-orm';
import { getDb, schema } from '../lib/db.js';
import { logger } from '../lib/logger.js';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hard-delete claims that were soft-deleted more than 90 days ago.
 * Runs on server startup and every 24 hours.
 */
export async function runClaimsCleanup(): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - NINETY_DAYS_MS);

  const result = await db
    .delete(schema.claims)
    .where(and(isNotNull(schema.claims.deletedAt), lt(schema.claims.deletedAt, cutoff)))
    .returning({ id: schema.claims.id });

  const count = result.length;
  if (count > 0) {
    logger.info({ count, cutoff: cutoff.toISOString() }, 'Claims cleanup: hard-deleted old claims');
  }
  return count;
}

/**
 * Schedule claims cleanup: run on startup, then every 24h.
 */
export function scheduleClaimsCleanup(): void {
  runClaimsCleanup().catch((err) => {
    logger.error({ err }, 'Claims cleanup failed on startup');
  });

  const interval = setInterval(() => {
    runClaimsCleanup().catch((err) => {
      logger.error({ err }, 'Claims cleanup failed');
    });
  }, INTERVAL_MS);

  interval.unref();
}
