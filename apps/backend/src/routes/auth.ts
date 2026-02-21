import { Hono } from 'hono';
import { validate } from '../utils/validate.js';
import { loginSchema, refreshSchema } from '../utils/validators.js';
import { loginWithGoogle, refreshAccessToken, logout, getUserById } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import type { AppVariables } from '../types/index.js';

const auth = new Hono<AppVariables>();

/**
 * POST /auth/login
 * Verify Google ID token, enforce @umass.edu domain, issue JWT pair.
 */
auth.post(
  '/login',
  rateLimit({ max: 20, windowMs: 15 * 60 * 1000 }),
  validate('json', loginSchema),
  async (c) => {
    const { idToken } = c.req.valid('json');
    const result = await loginWithGoogle(idToken);
    return c.json(successResponse(result), 200);
  },
);

/**
 * POST /auth/refresh
 * Exchange a valid refresh token for a new access + refresh token pair.
 */
auth.post(
  '/refresh',
  rateLimit({ max: 30, windowMs: 15 * 60 * 1000 }),
  validate('json', refreshSchema),
  async (c) => {
    const { refreshToken } = c.req.valid('json');
    const tokens = await refreshAccessToken(refreshToken);
    return c.json(successResponse(tokens), 200);
  },
);

/**
 * POST /auth/logout
 * Revoke the current refresh token.
 */
auth.post('/logout', requireAuth(), async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : undefined;

  await logout(user.sub!, refreshToken);
  return c.json(successResponse({ message: 'Logged out successfully' }));
});

/**
 * GET /auth/me
 * Return current authenticated user profile.
 */
auth.get('/me', requireAuth(), async (c) => {
  const user = c.get('user');
  const profile = await getUserById(user.sub!);

  if (!profile) {
    return c.json(errorResponse('NOT_FOUND', 'User not found'), 404);
  }

  return c.json(
    successResponse({
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      createdAt: profile.createdAt,
    }),
  );
});

export default auth;
