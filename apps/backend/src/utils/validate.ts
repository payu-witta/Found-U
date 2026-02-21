import { zValidator } from '@hono/zod-validator';
import type { ZodType } from 'zod';

/**
 * Typed validator with consistent error format.
 * Replaces zValidator() everywhere to ensure all validation errors
 * return { success: false, error: { code, message, details } } with 422.
 */
export const validate = <T extends ZodType>(
  target: 'json' | 'query' | 'form' | 'param' | 'header',
  schema: T,
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: result.error.flatten().fieldErrors,
          },
        },
        422,
      );
    }
    return;
  });
