import { Hono } from 'hono';
import { validate } from '../utils/validate.js';
import { createClaimSchema, verifyClaimSchema } from '../utils/validators.js';
import type { AppVariables } from '../types/index.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { createClaim, verifyClaim, getClaimsForItem } from '../services/claims.service.js';
import { successResponse } from '../utils/helpers.js';

const claims = new Hono<AppVariables>();

/**
 * POST /claims/create
 * Submit a claim for a found item with ownership verification answer.
 */
claims.post(
  '/create',
  requireAuth(),
  rateLimit({ max: 10, windowMs: 60 * 60 * 1000 }),
  validate('json', createClaimSchema),
  async (c) => {
    const user = c.get('user');
    const { itemId, verificationAnswer, notes } = c.req.valid('json');

    const claim = await createClaim({
      itemId,
      claimantId: user.sub!,
      verificationAnswer,
      notes,
    });

    return c.json(successResponse(claim), 201);
  },
);

/**
 * POST /claims/verify
 * Item owner approves or rejects a claim.
 */
claims.post(
  '/verify',
  requireAuth(),
  rateLimit({ max: 30, windowMs: 15 * 60 * 1000 }),
  validate('json', verifyClaimSchema),
  async (c) => {
    const user = c.get('user');
    const { claimId, action } = c.req.valid('json');

    const result = await verifyClaim({
      claimId,
      itemOwnerId: user.sub!,
      action,
    });

    return c.json(successResponse(result));
  },
);

/**
 * GET /claims/item/:itemId
 * Get all claims for an item (item owner only).
 */
claims.get('/item/:itemId', requireAuth(), rateLimit(), async (c) => {
  const user = c.get('user');
  const itemId = c.req.param('itemId');

  const result = await getClaimsForItem(itemId, user.sub!);
  return c.json(successResponse(result));
});

export default claims;
