import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@foundu/db/schema';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let _db: ReturnType<typeof drizzle> | null = null;

export const getDb = () => {
  if (!_db) {
    const queryClient = postgres(env.DATABASE_URL, {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
      prepare: false,
      ssl: { rejectUnauthorized: false },
      onnotice: (notice) => {
        logger.debug({ notice }, 'DB notice');
      },
    });

    _db = drizzle(queryClient, {
      schema,
      logger: env.NODE_ENV === 'development',
    });
  }
  return _db;
};

/**
 * Backward-compatible schema guard for demo/dev environments.
 * Ensures new optional columns exist even if migrations lag behind.
 */
export async function ensureSchemaCompatibility(): Promise<void> {
  const db = getDb();
  await db.execute(sql`ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS spire_id varchar(8)`);
  await db.execute(sql`ALTER TABLE IF EXISTS claimed_items ADD COLUMN IF NOT EXISTS spire_id varchar(8)`);
}

export { schema };
export type DB = ReturnType<typeof getDb>;
