import { vi } from 'vitest';

// Mock external dependencies globally so individual test files stay clean.
// Tests that need specific return values can override with vi.mocked().mockResolvedValue().

vi.mock('../lib/db.js', () => ({
  getDb: vi.fn(() => ({})),
  schema: {},
}));

vi.mock('../lib/redis.js', () => ({
  getRedis: vi.fn(() => null),
  isRedisReady: vi.fn(() => false),
  closeRedis: vi.fn(),
}));

vi.mock('../lib/email.js', () => ({
  sendMatchFoundEmail: vi.fn().mockResolvedValue(undefined),
  sendClaimEmail: vi.fn().mockResolvedValue(undefined),
  sendUCardFoundEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@foundu/ai', async (importActual) => {
  const actual = await importActual<typeof import('@foundu/ai')>();
  return {
    ...actual,
    // Override only the functions that make real network calls
    analyzeItemImage: vi.fn(),
    generateVerificationQuestion: vi.fn(),
    generateEmbedding: vi.fn(),
    generateItemEmbedding: vi.fn(),
    extractUCardData: vi.fn(),
    composeEmbeddingText: vi.fn((input: { title: string }) => `Title: ${input.title}`),
    // withRetry is a pure utility — keep the real implementation
  };
});
