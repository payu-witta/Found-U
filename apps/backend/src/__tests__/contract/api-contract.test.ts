/**
 * API Contract Tests
 *
 * These tests verify that every backend response shape exactly matches what the
 * frontend's Zod schemas expect.  They run entirely in-process (no real DB, no
 * real network) so they work in CI without credentials.
 *
 * Frontend schema reference: apps/frontend/src/lib/types/item.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { Hono } from 'hono';
import type { AppVariables } from '../../types/index.js';

// ── Mirror the frontend's Zod schemas exactly ─────────────────────────────────

const ItemCategory = z.enum([
  'electronics', 'clothing', 'accessories', 'keys', 'wallet',
  'bag', 'ucard', 'water_bottle', 'textbook', 'other',
]);

const FoundMode = z.enum(['left_at_location', 'keeping']);

const FrontendItemSchema = z.object({
  id:               z.string(),
  user_id:          z.string(),
  type:             z.enum(['lost', 'found']),
  title:            z.string(),
  description:      z.string(),
  category:         z.string(),   // may be 'other' default
  location:         z.string(),
  date_occurred:    z.string(),
  image_url:        z.string(),
  found_mode:       FoundMode.optional(),
  contact_email:    z.string().optional(),
  status:           z.enum(['active', 'resolved', 'expired']),
  ai_metadata:      z.object({
    detected_objects: z.array(z.string()).optional(),
    color:            z.string().optional(),
    brand:            z.string().optional(),
    condition:        z.string().optional(),
  }).optional(),
  created_at:       z.string().datetime(),
  updated_at:       z.string().datetime(),
  user_display_name: z.string().optional(),
});

const FeedResponseSchema = z.object({
  items:       z.array(FrontendItemSchema),
  next_cursor: z.string().nullable(),
  has_more:    z.boolean(),
});

const UserItemsResponseSchema = z.object({
  items: z.array(FrontendItemSchema),
});

const SingleItemResponseSchema = z.object({
  success: z.literal(true),
  data:    FrontendItemSchema,
});

// ── Mock data in two forms ────────────────────────────────────────────────────
// MOCK_DB_ROW  — camelCase shape returned by Drizzle (used to mock getItemById / createItem)
// MOCK_SERIAL  — snake_case shape returned by getItemFeed after serializeItem() is called

const MOCK_DB_ROW = {
  id:             'item-123',
  userId:         'user-456',
  type:           'lost' as const,
  title:          'Lost AirPods',
  description:    'White AirPods Pro in black case',
  category:       'electronics',
  location:       'Campus Center',
  dateOccurred:   '2024-03-01',
  imageUrl:       'https://cdn.foundu.app/items/item-123.jpg',
  thumbnailUrl:   null,
  foundMode:      null,
  contactEmail:   null,
  isAnonymous:    false,
  status:         'active' as const,
  aiMetadata: {
    detectedObjects: ['AirPods', 'earbuds'],
    colors:          ['white'],
    brand:           'Apple',
    condition:       'good',
    distinctiveFeatures: [],
    verificationQuestion: null,
    verificationAnswerHash: null,
    confidence:      0.95,
  },
  createdAt:      new Date('2024-03-01T10:00:00Z'),
  updatedAt:      new Date('2024-03-01T10:00:00Z'),
  userDisplayName: 'Jane Doe',
};

const MOCK_FOUND_DB_ROW = {
  ...MOCK_DB_ROW,
  id:           'item-789',
  type:         'found' as const,
  title:        'Found Wallet',
  foundMode:    'keeping' as const,
  contactEmail: 'finder@umass.edu',
};

// getItemFeed returns already-serialized (snake_case) items — mimic that here
const MOCK_SERIAL = {
  id:               'item-123',
  user_id:          'user-456',
  type:             'lost',
  title:            'Lost AirPods',
  description:      'White AirPods Pro in black case',
  category:         'electronics',
  location:         'Campus Center',
  date_occurred:    '2024-03-01',
  image_url:        'https://cdn.foundu.app/items/item-123.jpg',
  status:           'active',
  ai_metadata: { detected_objects: ['AirPods', 'earbuds'], color: 'white', brand: 'Apple', condition: 'good' },
  created_at:       '2024-03-01T10:00:00.000Z',
  updated_at:       '2024-03-01T10:00:00.000Z',
  user_display_name: 'Jane Doe',
};

// ── Mock setup ────────────────────────────────────────────────────────────────

vi.mock('../../services/items.service.js', () => ({
  getItemFeed:           vi.fn(),
  createLostItem:        vi.fn(),
  createFoundItem:       vi.fn(),
  searchItemsByEmbedding: vi.fn(),
  getItemById:           vi.fn(),
  updateItemStatus:      vi.fn(),
}));

vi.mock('../../services/ai.service.js', () => ({
  generateSearchEmbedding:      vi.fn(),
  generateImageSearchEmbedding: vi.fn(),
  analyzeItemPipeline:          vi.fn(),
}));

vi.mock('../../middleware/rateLimit.js', () => ({
  rateLimit:       () => async (_c: unknown, next: () => Promise<void>) => next(),
  uploadRateLimit: () => async (_c: unknown, next: () => Promise<void>) => next(),
}));

vi.mock('../../middleware/auth.js', () => ({
  requireAuth: () =>
    async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
      c.set('user', { sub: 'user-456', email: 'test@umass.edu' });
      await next();
    },
  optionalAuth: () =>
    async (_c: unknown, next: () => Promise<void>) => next(),
}));

import {
  getItemFeed,
  createLostItem,
  createFoundItem,
  getItemById,
} from '../../services/items.service.js';
import items from '../../routes/items.js';

const app = new Hono<AppVariables>();
app.route('/items', items);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Contract: GET /items/feed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('response matches FeedResponseSchema (items present)', async () => {
    vi.mocked(getItemFeed).mockResolvedValue({
      items: [MOCK_SERIAL as never],
      next_cursor: 'cursor-token',
      has_more: true,
    });

    const res = await app.request('/items/feed');
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = FeedResponseSchema.safeParse(body);
    expect(parsed.success, JSON.stringify(parsed.error?.format())).toBe(true);
  });

  it('response matches FeedResponseSchema (empty, no more pages)', async () => {
    vi.mocked(getItemFeed).mockResolvedValue({ items: [], next_cursor: null, has_more: false });

    const res = await app.request('/items/feed');
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = FeedResponseSchema.safeParse(body);
    expect(parsed.success, JSON.stringify(parsed.error?.format())).toBe(true);
    expect(parsed.data?.next_cursor).toBeNull();
    expect(parsed.data?.has_more).toBe(false);
  });

  it('cursor and type params are forwarded to service', async () => {
    vi.mocked(getItemFeed).mockResolvedValue({ items: [], next_cursor: null, has_more: false });
    await app.request('/items/feed?cursor=2024-03-01T10%3A00%3A00.000Z&limit=5&type=found');
    expect(getItemFeed).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: '2024-03-01T10:00:00.000Z', limit: 5, type: 'found' }),
    );
  });
});

describe('Contract: GET /items/me', () => {
  beforeEach(() => vi.clearAllMocks());

  it('response matches { items: Item[] }', async () => {
    vi.mocked(getItemFeed).mockResolvedValue({
      items: [MOCK_SERIAL as never],
      next_cursor: null,
      has_more: false,
    });

    const res = await app.request('/items/me');
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = UserItemsResponseSchema.safeParse(body);
    expect(parsed.success, JSON.stringify(parsed.error?.format())).toBe(true);
  });

  it('filters by authenticated user ID', async () => {
    vi.mocked(getItemFeed).mockResolvedValue({ items: [], next_cursor: null, has_more: false });
    await app.request('/items/me');
    expect(getItemFeed).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-456' }),
    );
  });
});

describe('Contract: GET /items/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('response matches { success: true, data: Item }', async () => {
    vi.mocked(getItemById).mockResolvedValue(MOCK_DB_ROW as never);

    const res = await app.request('/items/item-123');
    expect(res.status).toBe(200);
    const body = await res.json();
    const parsed = SingleItemResponseSchema.safeParse(body);
    expect(parsed.success, JSON.stringify(parsed.error?.format())).toBe(true);
  });

  it('item with found_mode=keeping is serialized correctly', async () => {
    vi.mocked(getItemById).mockResolvedValue(MOCK_FOUND_DB_ROW as never);

    const res = await app.request('/items/item-789');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { found_mode: string; contact_email: string } };
    expect(body.data.found_mode).toBe('keeping');
    expect(body.data.contact_email).toBe('finder@umass.edu');
  });

  it('returns 404 with error shape when not found', async () => {
    vi.mocked(getItemById).mockResolvedValue(null as never);
    const res = await app.request('/items/missing');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

describe('Contract: POST /items/lost (removed)', () => {
  it('returns 410 Gone - lost feature removed', async () => {
    const fd = new FormData();
    fd.append('title', 'Lost AirPods');
    fd.append('description', 'White AirPods');
    const res = await app.request('/items/lost', { method: 'POST', body: fd });
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('GONE');
  });
});

describe('Contract: POST /items/found (field name mapping)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads found_mode and contact_email from snake_case form fields', async () => {
    vi.mocked(createFoundItem).mockResolvedValue(MOCK_FOUND_DB_ROW as never);

    const fd = new FormData();
    fd.append('title', 'Found Wallet');
    fd.append('description', 'Brown leather wallet');
    fd.append('category', 'wallet');
    fd.append('location', 'Library');
    fd.append('date_occurred', '2024-03-01');
    fd.append('found_mode', 'keeping');           // snake_case — frontend sends this
    fd.append('contact_email', 'finder@umass.edu');

    const res = await app.request('/items/found', { method: 'POST', body: fd });
    expect(res.status).toBe(201);

    // Service was called with the correct mapped values
    expect(createFoundItem).toHaveBeenCalledWith(
      expect.objectContaining({
        foundMode: 'keeping',
        contactEmail: 'finder@umass.edu',
      }),
    );

    const body = await res.json();
    const parsed = SingleItemResponseSchema.safeParse(body);
    expect(parsed.success, JSON.stringify(parsed.error?.format())).toBe(true);
  });
});

describe('Contract: item.category values', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    'electronics', 'clothing', 'accessories', 'keys',
    'wallet', 'bag', 'ucard', 'water_bottle', 'textbook', 'other',
  ] as const)('category "%s" is accepted in the feed query', async (category) => {
    vi.mocked(getItemFeed).mockResolvedValue({ items: [], next_cursor: null, has_more: false });
    const res = await app.request(`/items/feed?category=${category}`);
    expect(res.status).toBe(200);
  });

  it('rejects Title-Case categories that the old backend used', async () => {
    const res = await app.request('/items/feed?category=Electronics');
    // Zod validation fails → 422
    expect(res.status).toBe(422);
  });
});
