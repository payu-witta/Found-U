import { describe, it, expect } from 'vitest';
import {
  buildPaginationMeta,
  successResponse,
  errorResponse,
  hashRefreshToken,
  getPaginationOffset,
} from '../../utils/helpers.js';

describe('buildPaginationMeta', () => {
  it('computes hasMore correctly when more pages exist', () => {
    const meta = buildPaginationMeta(1, 20, 50);
    expect(meta).toEqual({ page: 1, limit: 20, total: 50, hasMore: true, totalPages: 3 });
  });

  it('hasMore is false on the last page', () => {
    const meta = buildPaginationMeta(3, 20, 50);
    expect(meta.hasMore).toBe(false);
  });

  it('handles empty results', () => {
    const meta = buildPaginationMeta(1, 20, 0);
    expect(meta).toEqual({ page: 1, limit: 20, total: 0, hasMore: false, totalPages: 0 });
  });
});

describe('getPaginationOffset', () => {
  it('returns 0 for page 1', () => {
    expect(getPaginationOffset(1, 20)).toBe(0);
  });

  it('returns correct offset for page 3 with limit 10', () => {
    expect(getPaginationOffset(3, 10)).toBe(20);
  });
});

describe('successResponse', () => {
  it('wraps data with success: true', () => {
    const res = successResponse({ id: '1' });
    expect(res).toEqual({ success: true, data: { id: '1' } });
  });

  it('includes meta when provided', () => {
    const meta = { page: 1, total: 5 };
    const res = successResponse([], meta);
    expect(res.meta).toEqual(meta);
  });
});

describe('errorResponse', () => {
  it('wraps error with success: false', () => {
    const res = errorResponse('NOT_FOUND', 'Item not found');
    expect(res).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Item not found' },
    });
  });

  it('includes details when provided', () => {
    const res = errorResponse('VALIDATION_ERROR', 'Invalid input', { field: ['Required'] });
    expect(res.error).toHaveProperty('details');
  });
});

describe('hashRefreshToken', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = hashRefreshToken('some-token');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('is deterministic', () => {
    expect(hashRefreshToken('abc')).toBe(hashRefreshToken('abc'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashRefreshToken('token-a')).not.toBe(hashRefreshToken('token-b'));
  });
});
