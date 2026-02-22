import { lt, and, isNotNull } from 'drizzle-orm';
import { getDb, schema } from '../lib/db.js';
import { logger } from '../lib/logger.js';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const INTERVAL_MS = 24 * 60 * 60 * 1000;

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
