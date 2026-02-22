import postgres from 'postgres';
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

export { schema };
export type DB = ReturnType<typeof getDb>;
