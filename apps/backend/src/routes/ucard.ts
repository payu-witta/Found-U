import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import type { AppVariables } from '../types/index.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { processUCardSubmission, getUCardRecovery, reportLostUCard } from '../services/ucard.service.js';
import { validateImageMagicBytes } from '../utils/validators.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { HTTPException } from 'hono/http-exception';

const ucard = new Hono<AppVariables>();

const reportLostSchema = z.object({
  spireId: z.string().regex(/^\d{8}$/, 'SPIRE ID must be exactly 8 digits'),
});

/**
 * POST /ucard/report-lost
 * Report a lost UCard with SPIRE ID. Stored as Argon2 hash only.
 */
ucard.post(
  '/report-lost',
  requireAuth(),
  rateLimit({ max: 5, windowMs: 60 * 60 * 1000 }),
  async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { spireId } = reportLostSchema.parse(body);

    const result = await reportLostUCard({
      userId: user.sub!,
      spireId,
    });

    return c.json(successResponse(result), 201);
  },
);

/**
 * POST /ucard/submit
 * Submit a found UCard. Requires authentication (no anonymous UCard submissions).
 * Accepts multipart/form-data with `image` field.
 */
ucard.post(
  '/submit',
  requireAuth(),
  rateLimit({ max: 5, windowMs: 60 * 60 * 1000 }), // Very low limit for UCard submissions
  async (c) => {
    const user = c.get('user');
    const contentType = c.req.header('content-type') ?? '';

    if (!contentType.includes('multipart/form-data')) {
      throw new HTTPException(415, { message: 'Expected multipart/form-data' });
    }

    const formData = await c.req.formData();
    const imageFile = formData.get('image');
    const finderNote = formData.get('note') as string | null;

    if (!imageFile || !(imageFile instanceof File)) {
      throw new HTTPException(400, { message: 'Missing image field' });
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());

    if (!validateImageMagicBytes(buffer)) {
      throw new HTTPException(422, { message: 'Invalid image file' });
    }

    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxBytes) {
      throw new HTTPException(413, { message: 'Image too large (max 10MB)' });
    }

    const result = await processUCardSubmission({
      finderId: user.sub!,
      imageBuffer: buffer,
      finderNote: finderNote ?? undefined,
    });

    return c.json(successResponse(result), 201);
  },
);

/**
 * GET /ucard/:recoveryId
 * Get UCard recovery status (finder can check their submission).
 */
ucard.get('/:recoveryId', requireAuth(), rateLimit(), async (c) => {
  const user = c.get('user');
  const recoveryId = c.req.param('recoveryId');

  const recovery = await getUCardRecovery(recoveryId);

  if (!recovery) {
    return c.json(errorResponse('NOT_FOUND', 'UCard recovery not found'), 404);
  }

  return c.json(successResponse(recovery));
});

export default ucard;
