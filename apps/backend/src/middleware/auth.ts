import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { verifyAccessToken } from '../lib/jwt.js';
import { logger } from '../lib/logger.js';

/**
 * Validates Bearer token from Authorization header and sets user context.
 */
export const requireAuth = (): MiddlewareHandler => async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, {
      message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(token);
    c.set('user', payload);
    await next();
  } catch (err) {
    logger.warn({ err }, 'JWT verification failed');
    throw new HTTPException(401, {
      message: 'Invalid or expired access token',
    });
  }
};

/**
 * Optional auth — sets user context if token is present but doesn't reject if missing.
 */
export const optionalAuth = (): MiddlewareHandler => async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyAccessToken(token);
      c.set('user', payload);
    } catch {
      // Silently ignore invalid tokens for optional auth
    }
  }

  await next();
};
