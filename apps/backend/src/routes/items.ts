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
  IMAGE_SEARCH_SIMILARITY_THRESHOLD,
} from '../services/items.service.js';
import { generateSearchEmbedding, generateImageSearchEmbedding } from '../services/ai.service.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { successResponse, errorResponse, serializeItem } from '../utils/helpers.js';
import { HTTPException } from 'hono/http-exception';
import { env } from '../config/env.js';

const items = new Hono<AppVariables>();

function getOptionalFormString(formData: FormData, fieldName: string): string | undefined {
  const value = formData.get(fieldName);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * POST /items/lost
 * Create a lost item report. Accepts multipart/form-data with optional image.
 */
items.post(
  '/lost',
  requireAuth(),
  rateLimit({
    max: env.ITEM_POST_RATE_LIMIT_MAX_REQUESTS,
    windowMs: env.ITEM_POST_RATE_LIMIT_WINDOW_MS,
  }),
  async (c) => {
    const user = c.get('user');
    const contentType = c.req.header('content-type') ?? '';

    if (!contentType.includes('multipart/form-data')) {
      throw new HTTPException(415, { message: 'Expected multipart/form-data' });
    }

    const formData = await c.req.formData();
    const rawData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: getOptionalFormString(formData, 'category'),
      spireId: getOptionalFormString(formData, 'spire_id'),
      location: getOptionalFormString(formData, 'location'),
      dateLost: getOptionalFormString(formData, 'date_occurred'),
    };

    const validated = createLostItemSchema.parse(rawData);

    const item = await createLostItem({
      userId: user.sub!,
      ...validated,
      formData,
    });

    return c.json(successResponse(serializeItem({ ...item, userDisplayName: null })), 201);
  },
);

/**
 * POST /items/found
 * Create a found item report. Accepts multipart/form-data with optional image.
 */
items.post(
  '/found',
  requireAuth(),
  rateLimit({
    max: env.ITEM_POST_RATE_LIMIT_MAX_REQUESTS,
    windowMs: env.ITEM_POST_RATE_LIMIT_WINDOW_MS,
  }),
  async (c) => {
    const user = c.get('user');
    const contentType = c.req.header('content-type') ?? '';

    if (!contentType.includes('multipart/form-data')) {
      throw new HTTPException(415, { message: 'Expected multipart/form-data' });
    }

    const formData = await c.req.formData();

    const rawData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: getOptionalFormString(formData, 'category'),
      spireId: getOptionalFormString(formData, 'spire_id'),
      location: getOptionalFormString(formData, 'location'),
      dateFound: getOptionalFormString(formData, 'date_occurred'),
      foundMode: formData.get('found_mode') as string,
      contactEmail: getOptionalFormString(formData, 'contact_email'),
      isAnonymous: getOptionalFormString(formData, 'is_anonymous'),
    };

    const validated = createFoundItemSchema.parse(rawData);

    const item = await createFoundItem({
      userId: user.sub!,
      ...validated,
      formData,
    });

    return c.json(successResponse(serializeItem({ ...item, userDisplayName: null })), 201);
  },
);

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
      sort: params.sort,
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

    return c.json(successResponse({ items: results }));
  },
);

/**
 * POST /items/search/image
 * Reverse image search — upload an image, get visually similar items.
 */
items.post(
  '/search/image',
  optionalAuth(),
  rateLimit({ max: 30, windowMs: 60_000 }),
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
    const results = await searchItemsByEmbedding({
      queryEmbedding,
      type,
      limit,
      minSimilarity: IMAGE_SEARCH_SIMILARITY_THRESHOLD,
    });

    return c.json(successResponse({ items: results }));
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
