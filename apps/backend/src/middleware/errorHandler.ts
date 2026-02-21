import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId') as string | undefined;

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    if (err.status >= 500) {
      logger.error({ err, requestId }, 'HTTP exception (5xx)');
    } else {
      logger.warn({ status: err.status, message: err.message, requestId }, 'HTTP exception (4xx)');
    }

    return c.json(
      {
        success: false,
        error: {
          code: httpStatusToCode(err.status),
          message: err.message,
        },
      },
      err.status,
    );
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    logger.warn({ errors: err.errors, requestId }, 'Validation error');
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: err.flatten().fieldErrors,
        },
      },
      422,
    );
  }

  // Unhandled errors — log fully
  logger.error({ err, requestId, stack: err instanceof Error ? err.stack : undefined }, 'Unhandled error');

  const isDev = process.env.NODE_ENV === 'development';

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        ...(isDev && err instanceof Error ? { detail: err.message } : {}),
      },
    },
    500,
  );
};

function httpStatusToCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
  };
  return codes[status] ?? 'ERROR';
}
