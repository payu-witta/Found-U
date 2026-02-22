import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import type { AppVariables } from '../types/index.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { getDb, schema } from '../lib/db.js';
import { successResponse } from '../utils/helpers.js';
import { env } from '../config/env.js';

const notifications = new Hono<AppVariables>();

/**
 * POST /notifications/test (dev only)
 * Create a test ucard_found notification for the current user.
 * Use this to verify the bell badge and notification flow without the full UCard upload flow.
 */
if (env.NODE_ENV === 'development') {
  notifications.post('/test', requireAuth(), rateLimit({ max: 10, windowMs: 60_000 }), async (c) => {
    const user = c.get('user');
    const db = getDb();

    await db.insert(schema.notifications).values({
      userId: user.sub!,
      type: 'ucard_found',
      title: '[Test] Your UCard Was Found!',
      body: 'This is a test notification. Your UCard recovery flow is working.',
      data: { test: true },
    });

    return c.json({ success: true, message: 'Test notification created' });
  });
}

/**
 * GET /notifications/unread-count
 * Return the count of unread notifications for the current user (for bell badge).
 */
notifications.get('/unread-count', requireAuth(), rateLimit(), async (c) => {
  const user = c.get('user');
  const db = getDb();

  const rows = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, user.sub!));

  const unreadCount = rows.filter((r) => !r.read).length;

  return c.json({ unreadCount });
});
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
    const recoveryId = data.recoveryId as string | undefined;

    // Map DB notification types to frontend types
    let type: 'match_found' | 'claim_update' | 'item_resolved' | 'ucard_found';
    if (n.type === 'match_found') {
      type = 'match_found';
    } else if (n.type === 'claim_submitted' || n.type === 'claim_approved') {
      type = 'claim_update';
    } else if (n.type === 'ucard_found') {
      type = 'ucard_found';
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
      recovery_id: recoveryId,
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
      and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, user.sub!),
      ),
    );

  return c.json(successResponse({ id: notificationId, read: true }));
});

export default notifications;
