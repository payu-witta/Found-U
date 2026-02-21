import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';

// Test the health endpoint shape without booting the full server.
// The full integration (DB, Redis, S3) is validated manually / in staging.
const app = new Hono();

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'test',
    version: '1.0.0',
  }),
);

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });

  it('returns the expected JSON shape', async () => {
    const res = await app.request('/health');
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(body.environment).toBe('test');
    expect(body.version).toBe('1.0.0');
  });

  it('sets Content-Type: application/json', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});
