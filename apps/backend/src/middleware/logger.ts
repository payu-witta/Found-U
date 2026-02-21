import type { MiddlewareHandler } from 'hono';
import { logger as pinoLogger } from '../lib/logger.js';
import { randomUUID } from 'crypto';

export const requestLogger = (): MiddlewareHandler => async (c, next) => {
  const requestId = randomUUID();
  const startTime = Date.now();

  c.set('requestId', requestId);

  const log = pinoLogger.child({
    requestId,
    method: c.req.method,
    path: c.req.path,
  });

  log.info('Request received');

  await next();

  const duration = Date.now() - startTime;

  log.info(
    {
      status: c.res.status,
      durationMs: duration,
    },
    'Request completed',
  );
};
