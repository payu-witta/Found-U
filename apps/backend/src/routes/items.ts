import { Hono } from 'hono';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import type { AppVariables } from '../types/index.js';
import {
  createLostItemSchema,
  createFoundItemSchema,
  feedQuerySchema,
  searchQuerySchema,
} from '../utils/validators.js';
import {
  createLostItem,
  createFoundItem,
  getItemFeed,
  searchItemsByEmbedding,
  getItemById,
  updateItemStatus,
} from '../services/items.service.js';
import { generateSearchEmbedding, generateImageSearchEmbedding } from '../services/ai.service.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { successResponse, errorResponse, serializeItem } from '../utils/helpers.js';
import { HTTPException } from 'hono/http-exception';

const items = new Hono<AppVariables>();

/**
 * POST /items/lost
 * Create a lost item report. Accepts multipart/form-data with optional image.
 */
items.post('/lost', requireAuth(), rateLimit({ max: 10, windowMs: 60 * 60 * 1000 }), async (c) => {
  const user = c.get('user');
  const contentType = c.req.header('content-type') ?? '';

  if (!contentType.includes('multipart/form-data')) {
    throw new HTTPException(415, { message: 'Expected multipart/form-data' });
  }

  const formData = await c.req.formData();

  // Validate text fields
  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string | undefined,
    category: formData.get('category') as string | undefined,
    location: formData.get('location') as string | undefined,
    dateLost: formData.get('date_occurred') as string | undefined,
  };

  const validated = createLostItemSchema.parse(rawData);

  const item = await createLostItem({
    userId: user.sub!,
    ...validated,
    formData,
  });

  return c.json(successResponse(serializeItem({ ...item, userDisplayName: null })), 201);
});

/**
 * POST /items/found
 * Create a found item report. Accepts multipart/form-data with optional image.
 */
items.post('/found', requireAuth(), rateLimit({ max: 10, windowMs: 60 * 60 * 1000 }), async (c) => {
  const user = c.get('user');
  const contentType = c.req.header('content-type') ?? '';

  if (!contentType.includes('multipart/form-data')) {
    throw new HTTPException(415, { message: 'Expected multipart/form-data' });
  }

  const formData = await c.req.formData();

  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string | undefined,
    category: formData.get('category') as string | undefined,
    location: formData.get('location') as string | undefined,
    dateFound: formData.get('date_occurred') as string | undefined,
    foundMode: formData.get('found_mode') as string,
    contactEmail: formData.get('contact_email') as string | undefined,
    isAnonymous: formData.get('is_anonymous') as string | undefined,
  };

  const validated = createFoundItemSchema.parse(rawData);

  const item = await createFoundItem({
    userId: user.sub!,
    ...validated,
    formData,
  });

  return c.json(successResponse(serializeItem({ ...item, userDisplayName: null })), 201);
});

/**
 * GET /items/feed
 * Paginated feed of items, sorted by recency.
 */
items.get(
  '/feed',
  optionalAuth(),
  rateLimit(),
  validate('query', feedQuerySchema),
  async (c) => {
    const params = c.req.valid('query');
    const result = await getItemFeed({
      cursor: params.cursor,
      limit: params.limit,
      type: params.type,
      category: params.category,
      location: params.location,
      status: params.status,
    });

    return c.json(result);
  },
);

/**
 * GET /items/search
 * Semantic search using vector similarity.
 * Query param `q` → text search, or post a `image` in multipart for visual search.
 */
items.get(
  '/search',
  optionalAuth(),
  rateLimit({ max: 30, windowMs: 60_000 }),
  validate('query', searchQuerySchema),
  async (c) => {
    const { q, type, limit } = c.req.valid('query');

    const queryEmbedding = await generateSearchEmbedding(q);
    const results = await searchItemsByEmbedding({ queryEmbedding, type, limit });

    return c.json(successResponse(results));
  },
);

/**
 * POST /items/search/image
 * Reverse image search — upload an image, get visually similar items.
 */
items.post(
  '/search/image',
  optionalAuth(),
  rateLimit({ max: 10, windowMs: 60_000 }),
  async (c) => {
    const contentType = c.req.header('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      throw new HTTPException(415, { message: 'Expected multipart/form-data with an image field' });
    }

    const formData = await c.req.formData();
    const imageFile = formData.get('image');
    if (!imageFile || !(imageFile instanceof File)) {
      throw new HTTPException(400, { message: 'Missing image field' });
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';
    const type = formData.get('type') as 'lost' | 'found' | undefined;
    const limit = Math.min(Number(formData.get('limit') ?? 10), 50);

    const queryEmbedding = await generateImageSearchEmbedding(base64, mimeType);
    const results = await searchItemsByEmbedding({ queryEmbedding, type, limit });

    return c.json(successResponse(results));
  },
);

/**
 * GET /items/me
 * Get the authenticated user's own items.
 */
items.get('/me', requireAuth(), rateLimit(), async (c) => {
  const user = c.get('user');
  const result = await getItemFeed({
    cursor: undefined,
    limit: 50,
    userId: user.sub!,
  });
  return c.json({ items: result.items });
});

/**
 * GET /items/:id
 * Get a single item by ID.
 */
items.get('/:id', optionalAuth(), rateLimit(), async (c) => {
  const itemId = c.req.param('id');
  const item = await getItemById(itemId);

  if (!item) {
    return c.json(errorResponse('NOT_FOUND', 'Item not found'), 404);
  }

  return c.json(successResponse(serializeItem({ ...item, userDisplayName: null })));
});

/**
 * PATCH /items/:id/status
 * Update item status (owner only).
 */
items.patch(
  '/:id/status',
  requireAuth(),
  validate('json', z.object({ status: z.enum(['active', 'resolved', 'expired']) })),
  async (c) => {
    const user = c.get('user');
    const itemId = c.req.param('id');
    const { status } = c.req.valid('json');

    const updated = await updateItemStatus(itemId, user.sub!, status);
    return c.json(successResponse(updated));
  },
);

export default items;
