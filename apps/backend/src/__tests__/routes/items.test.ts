import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppVariables } from '../../types/index.js';

// Mock services before importing the router
vi.mock('../../services/items.service.js', () => ({
  getItemFeed: vi.fn(),
  createLostItem: vi.fn(),
  createFoundItem: vi.fn(),
  searchItemsByEmbedding: vi.fn(),
  getItemById: vi.fn(),
  updateItemStatus: vi.fn(),
}));

vi.mock('../../services/ai.service.js', () => ({
  generateSearchEmbedding: vi.fn(),
  generateImageSearchEmbedding: vi.fn(),
  analyzeItemPipeline: vi.fn(),
}));

vi.mock('../../middleware/rateLimit.js', () => ({
  rateLimit: () => async (_c: unknown, next: () => Promise<void>) => next(),
  uploadRateLimit: () => async (_c: unknown, next: () => Promise<void>) => next(),
}));

vi.mock('../../middleware/auth.js', () => ({
  requireAuth:
    () =>
    async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
      c.set('user', { sub: 'test-user-id', email: 'test@umass.edu' });
      await next();
    },
  optionalAuth:
    () =>
    async (_c: unknown, next: () => Promise<void>) =>
      next(),
}));

import { getItemFeed, getItemById } from '../../services/items.service.js';
import items from '../../routes/items.js';

const testApp = new Hono<AppVariables>();
testApp.route('/items', items);

describe('GET /items/feed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with paginated items', async () => {
    vi.mocked(getItemFeed).mockResolvedValue({
      items: [{ id: '1', title: 'Lost keys', type: 'lost' } as never],
      next_cursor: null,
      has_more: false,
    });

    const res = await testApp.request('/items/feed');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[]; has_more: boolean };
    expect(body.items).toHaveLength(1);
    expect(body.has_more).toBe(false);
  });

  it('passes query params to the service', async () => {
    vi.mocked(getItemFeed).mockResolvedValue({
      items: [],
      next_cursor: null,
      has_more: false,
    });

    await testApp.request('/items/feed?limit=10&type=lost');
    expect(getItemFeed).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, type: 'lost' }),
    );
  });
});

describe('GET /items/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with item data when found', async () => {
    vi.mocked(getItemById).mockResolvedValue({
      id: 'abc', title: 'Found wallet', userId: 'u1', type: 'found',
      description: null, category: null, location: null, dateOccurred: null,
      imageUrl: null, foundMode: null, contactEmail: null, status: 'active',
      aiMetadata: null, createdAt: new Date('2024-01-01'), updatedAt: null,
    } as never);

    const res = await testApp.request('/items/abc');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('returns 404 when item does not exist', async () => {
    vi.mocked(getItemById).mockResolvedValue(null as never);

    const res = await testApp.request('/items/nonexistent');
    expect(res.status).toBe(404);
  });
});
