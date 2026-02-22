import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import type { AppVariables } from '../types/index.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { getDb, schema } from '../lib/db.js';
import { successResponse } from '../utils/helpers.js';

const notifications = new Hono<AppVariables>();

/**
 * GET /notifications
 * Return the authenticated user's notifications, newest first.
 */
notifications.get('/', requireAuth(), rateLimit(), async (c) => {
  const user = c.get('user');
  const db = getDb();

  const rows = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, user.sub!))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(50);

  const result = rows.map((n) => {
    const data = (n.data ?? {}) as Record<string, unknown>;
    const itemId =
      (data.itemId as string | undefined) ??
      (data.foundItemId as string | undefined) ??
      undefined;

    // Map DB notification types to frontend types
    let type: 'match_found' | 'claim_update' | 'item_resolved';
    if (n.type === 'match_found') {
      type = 'match_found';
    } else if (n.type === 'claim_submitted' || n.type === 'claim_approved') {
      type = 'claim_update';
    } else {
      type = 'item_resolved';
    }

    return {
      id: n.id,
      user_id: n.userId,
      type,
      title: n.title,
      message: n.body,
      item_id: itemId,
      read: n.read,
      created_at: n.createdAt.toISOString(),
    };
  });

  return c.json({ notifications: result });
});

/**
 * PATCH /notifications/:id/read
 * Mark a notification as read.
 */
notifications.patch('/:id/read', requireAuth(), rateLimit(), async (c) => {
  const user = c.get('user');
  const notificationId = c.req.param('id');
  const db = getDb();

  await db
    .update(schema.notifications)
    .set({ read: true })
    .where(
      eq(schema.notifications.id, notificationId),
    );

  return c.json(successResponse({ id: notificationId, read: true }));
});

export default notifications;
