import 'dotenv/config'; // DOTENV_CONFIG_PATH in package.json scripts points to monorepo root .env
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { compress } from 'hono/compress';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { requestLogger } from './middleware/logger.js';
import { rateLimit } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import router from './routes/index.js';

// ── App setup ──────────────────────────────────────────────────────────────────
const app = new Hono();

// Security headers
app.use('*', secureHeaders());

// Compression
app.use('*', compress());

// CORS — restrict to known origins
const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0]; // SSR / server-side requests
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 86400,
  }),
);

// Request logging
app.use('*', requestLogger());

// Global rate limit (per-route limits are additive)
app.use('*', rateLimit());

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: '1.0.0',
  });
});

app.get('/', (c) => {
  return c.json({
    name: 'FoundU API',
    version: '1.0.0',
    docs: '/health',
  });
});

// ── API routes ─────────────────────────────────────────────────────────────────
app.route('/api/v1', router);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${c.req.method} ${c.req.path} not found`,
      },
    },
    404,
  );
});

// ── Error handler ──────────────────────────────────────────────────────────────
app.onError(errorHandler);

// ── Start server ───────────────────────────────────────────────────────────────
const port = env.PORT;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info(
      {
        port: info.port,
        env: env.NODE_ENV,
        pid: process.pid,
      },
      `FoundU API server started on port ${info.port}`,
    );
  },
);

// ── Graceful shutdown ──────────────────────────────────────────────────────────
const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

export default app;
