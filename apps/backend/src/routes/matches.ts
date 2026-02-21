import { Hono } from 'hono';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import type { AppVariables } from '../types/index.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { getMatchesForItem } from '../services/matching.service.js';
import { getDb, schema } from '../lib/db.js';
import { eq, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { HTTPException } from 'hono/http-exception';

const matches = new Hono<AppVariables>();

/**
 * GET /matches/:itemId
 * Get top matches for a given item (lost or found).
 */
matches.get('/:itemId', requireAuth(), rateLimit(), async (c) => {
  const user = c.get('user');
  const itemId = c.req.param('itemId');

  const db = getDb();
  const [item] = await db
    .select({ userId: schema.items.userId })
    .from(schema.items)
    .where(eq(schema.items.id, itemId))
    .limit(1);

  if (!item) {
    return c.json(errorResponse('NOT_FOUND', 'Item not found'), 404);
  }

  if (item.userId !== user.sub) {
    throw new HTTPException(403, { message: 'You can only view matches for your own items' });
  }

  const result = await getMatchesForItem(itemId);
  return c.json(successResponse(result));
});

/**
 * PATCH /matches/:matchId/status
 * Update a match status (dismiss, confirm).
 */
matches.patch(
  '/:matchId/status',
  requireAuth(),
  validate('json', z.object({ status: z.enum(['confirmed', 'rejected']) })),
  async (c) => {
    const user = c.get('user');
    const matchId = c.req.param('matchId');
    const { status } = c.req.valid('json');

    const db = getDb();
    const [match] = await db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.id, matchId))
      .limit(1);

    if (!match) {
      return c.json(errorResponse('NOT_FOUND', 'Match not found'), 404);
    }

    // Verify user owns the lost item in this match
    const [lostItem] = await db
      .select({ userId: schema.items.userId })
      .from(schema.items)
      .where(eq(schema.items.id, match.lostItemId))
      .limit(1);

    if (!lostItem || lostItem.userId !== user.sub) {
      throw new HTTPException(403, { message: 'Not authorized to update this match' });
    }

    const [updated] = await db
      .update(schema.matches)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.matches.id, matchId))
      .returning();

    return c.json(successResponse(updated));
  },
);

export default matches;
