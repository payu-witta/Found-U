# FoundU Backend

Production-grade Node.js + TypeScript API for the FoundU campus lost-and-found platform.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Hono](https://hono.dev) on `@hono/node-server` |
| Language | TypeScript 5 (ESM, NodeNext) |
| Database | Supabase PostgreSQL + pgvector |
| ORM | Drizzle ORM + postgres.js |
| AI | Google Gemini 1.5 Flash · text-embedding-004 (768-dim) |
| Storage | AWS S3 (quarantine + main) + CloudFront CDN |
| Email | Resend |
| Auth | Google OAuth → JOSE JWT (HS256) |
| Hashing | Argon2id + server-side pepper |
| Rate limiting | Sliding window — Redis if `REDIS_URL` set, else in-memory |
| Testing | Vitest |
| CI/CD | GitHub Actions → AWS ECS Fargate |
| Monitoring | CloudWatch Logs (via ECS `awslogs` driver) |

---

## Infrastructure Diagram

```mermaid
graph TD
    Client["Frontend / Mobile"] -->|HTTPS| CF["CloudFront CDN"]
    Client -->|API Calls| ALB["Application Load Balancer"]
    ALB --> ECS["ECS Fargate\n(foundu-backend)"]

    ECS -->|Queries| DB[("Supabase\nPostgreSQL + pgvector")]
    ECS -->|Images| S3Q["S3 Quarantine\nBucket"]
    S3Q -->|Scan + Move| S3M["S3 Main Bucket"]
    S3M --> CF

    ECS -->|Vision · Embeddings| Gemini["Google Gemini 1.5 Flash\n+ text-embedding-004"]
    ECS -->|Transactional email| Resend["Resend Email"]
    ECS -->|Rate limiting\n(optional)| Redis[("Redis / ElastiCache")]
    ECS -->|Structured logs| CW["CloudWatch Logs"]
    CW --> Alarm["CloudWatch Alarms\n(error rate · latency)"]

    GH["GitHub main branch"] -->|Push| GHCI["GitHub Actions\nci.yml → deploy.yml"]
    GHCI -->|Build + Push| ECR["Amazon ECR"]
    ECR -->|New task def| ECS
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values. Secrets must **never** be committed.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Supabase) |
| `NODE_ENV` | ✅ | `development` \| `production` \| `test` |
| `PORT` | — | HTTP port (default `3001`) |
| `API_BASE_URL` | — | Self URL, used in emails (default `http://localhost:3001`) |
| `FRONTEND_URL` | — | Frontend URL for links in emails |
| `CORS_ORIGINS` | — | Comma-separated allowed CORS origins |
| `JWT_SECRET` | ✅ | ≥32 chars — signs access tokens (15 min TTL) |
| `JWT_REFRESH_SECRET` | ✅ | ≥32 chars — signs refresh tokens (7 day TTL) |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth 2.0 client ID |
| `ALLOWED_EMAIL_DOMAIN` | — | Domain restriction (default `umass.edu`) |
| `ARGON2_PEPPER` | ✅ | ≥32 chars — mixed into Argon2id hashes |
| `AWS_REGION` | ✅ | AWS region (default `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | ✅ | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | ✅ | IAM secret key |
| `S3_BUCKET_MAIN` | ✅ | S3 bucket for processed assets |
| `S3_BUCKET_QUARANTINE` | ✅ | S3 bucket for virus scan staging |
| `CLOUDFRONT_DOMAIN` | ✅ | CloudFront distribution URL (e.g. `https://cdn.foundu.app`) |
| `GOOGLE_AI_API_KEY` | ✅ | Gemini API key |
| `BREVO_API_KEY` | ✅ | Brevo API key |
| `EMAIL_FROM` | — | From address (default `noreply@foundu.app`) |
| `EMAIL_FROM_NAME` | — | From name (default `FoundU`) |
| `RATE_LIMIT_WINDOW_MS` | — | Global rate limit window (default `900000` = 15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | — | Global max requests per window (default `100`) |
| `MAX_FILE_SIZE_MB` | — | Image upload limit (default `10`) |
| `LOG_LEVEL` | — | Pino log level (default `info`) |
| `REDIS_URL` | — | Optional Redis URL. If absent, in-memory fallback is used |

**Production secrets** are managed via AWS Secrets Manager and injected into the ECS task definition at runtime.

---

## Running Locally

```bash
# 1. Install dependencies (from monorepo root)
pnpm install

# 2. Set up environment
cp ../../.env.example .env
# Fill in all required values in .env

# 3. Apply DB migration in Supabase SQL editor
#    File: packages/db/migrations/001_initial.sql
#    (Enable pgvector in Supabase dashboard first)

# 4. Start dev server
pnpm dev
# → http://localhost:3001
# → Swagger UI: http://localhost:3001/api/v1/docs
```

**Build for production:**
```bash
pnpm --filter @foundu/db build
pnpm --filter @foundu/ai build
pnpm --filter @foundu/backend build
node dist/index.js
```

---

## Testing

```bash
# Run all tests once
pnpm test

# Watch mode
pnpm test:watch

# With coverage report
pnpm test:coverage
```

Test structure:
```
src/__tests__/
├── setup.ts                  # Global mocks (DB, Redis, Gemini, S3, Resend)
├── unit/
│   ├── helpers.test.ts       # Pagination, response builders, token hashing
│   └── retry.test.ts         # Exponential backoff behaviour
└── routes/
    ├── health.test.ts        # GET /health shape and status
    └── items.test.ts         # GET /items/feed, GET /items/:id with mocked services
```

---

## API Documentation

Interactive Swagger UI available at `GET /api/v1/docs` (requires running server).
OpenAPI 3.1 JSON spec at `GET /api/v1/docs/openapi.json`.

### Route summary

All routes are prefixed with `/api/v1`.

#### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | — | Exchange Google ID token for JWT pair |
| `POST` | `/auth/refresh` | — | Rotate refresh token |
| `POST` | `/auth/logout` | ✓ | Revoke refresh token |
| `GET` | `/auth/me` | ✓ | Current user profile |

#### Items
| Method | Path | Auth | Limit | Description |
|--------|------|------|-------|-------------|
| `POST` | `/items/lost` | ✓ | 10/hr | Report lost item (multipart) |
| `POST` | `/items/found` | ✓ | 10/hr | Report found item (multipart) |
| `GET` | `/items/feed` | opt | — | Paginated item feed |
| `GET` | `/items/search?q=` | opt | 30/min | Semantic text search |
| `POST` | `/items/search/image` | opt | 10/min | Reverse image search |
| `GET` | `/items/:id` | opt | — | Single item |
| `PATCH` | `/items/:id/status` | ✓ | — | Update status (owner only) |

#### AI
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/ai/vision-analysis` | ✓ | Gemini vision analysis |
| `POST` | `/ai/generate-embedding` | ✓ | text-embedding-004 (768-dim) |

#### Matches
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/matches/:itemId` | ✓ | Top AI matches (owner only) |
| `PATCH` | `/matches/:matchId/status` | ✓ | Confirm or dismiss match |

#### Claims
| Method | Path | Auth | Limit | Description |
|--------|------|------|-------|-------------|
| `POST` | `/claims/create` | ✓ | 10/hr | Submit ownership claim |
| `POST` | `/claims/verify` | ✓ | 30/15min | Approve or reject claim |
| `GET` | `/claims/item/:itemId` | ✓ | — | List claims (owner only) |

#### UCard
| Method | Path | Auth | Limit | Description |
|--------|------|------|-------|-------------|
| `POST` | `/ucard/submit` | ✓ | **5/hr** | Submit found UCard image |
| `GET` | `/ucard/:recoveryId` | ✓ | — | Recovery status |

---

## CI/CD

Two GitHub Actions workflows:

### `ci.yml` — triggered on every push and PR

1. `pnpm install --frozen-lockfile`
2. Build `@foundu/db` and `@foundu/ai`
3. `tsc --noEmit` on backend
4. `vitest run` (full test suite)
5. Build Docker image (no push on PRs)

### `deploy.yml` — triggered on push to `main`

1. Run full test suite
2. Build Docker image → push to Amazon ECR (tagged with commit SHA + `latest`)
3. Record current ECS task definition ARN (for rollback)
4. Run DB migrations as a one-off ECS task
5. Register new task definition revision (updated image)
6. `aws ecs update-service` → wait for stability (10 min timeout)
7. **Automatic rollback**: if `deploy` step fails, re-pins the service to the previous task definition ARN

**Required GitHub secrets:**

| Secret | Description |
|--------|-------------|
| `AWS_DEPLOY_ROLE_ARN` | IAM role ARN for OIDC auth (no static keys) |
| `ECS_SUBNET_ID` | VPC subnet for migration task |
| `ECS_SECURITY_GROUP_ID` | Security group for migration task |

---

## Monitoring

CloudWatch Logs are configured via the ECS task definition's `awslogs` log driver:

```json
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/foundu-backend",
      "awslogs-region": "us-east-1",
      "awslogs-stream-prefix": "ecs"
    }
  }
}
```

The Pino logger outputs structured JSON in production, which CloudWatch Insights can query:

```sql
-- Errors in the last hour
fields @timestamp, message, err.message
| filter level >= 50
| sort @timestamp desc
| limit 50

-- Failed AI calls
fields @timestamp, message
| filter message like /gemini/ and level >= 40
| sort @timestamp desc
```

**Recommended CloudWatch Alarms:**
- `5xx error rate > 1%` over 5 minutes → SNS alert
- `p99 latency > 3s` over 5 minutes → SNS alert
- `AI circuit breaker open` log pattern → SNS alert

---

## AI Quota Management

Gemini 1.5 Flash (free tier): **15 req/min · 1 000 000 tokens/day**

| Strategy | Implementation |
|----------|---------------|
| **Exponential backoff** | `withRetry()` in `packages/ai/src/retry.ts` — 3 attempts, 500ms base, 10s cap with jitter |
| **Circuit breaker** | `aiCircuitBreaker` in `src/lib/circuit-breaker.ts` — opens after 5 failures, resets after 30s |
| **Rate limits** | `/items/lost` and `/items/found` capped at 10/hr each; `/ucard/submit` at 5/hr |
| **Fire-and-forget matching** | `runMatchingForItem()` does not block the item creation response |
| **Production recommendation** | Upgrade to Gemini 1.5 Flash paid tier or batch embedding generation via a queue |

---

## Security Model

| Concern | Implementation |
|---------|---------------|
| Auth | Google OAuth ID token verified via tokeninfo API; restricted to `@umass.edu` |
| JWT | HS256, 15min access tokens; 7-day refresh tokens with SHA-256 hash in DB + rotation |
| SPIRE ID | Argon2id (65MB, 3 iters, 4 threads) + server-side pepper; raw ID never stored or logged |
| Verification answers | Argon2id hashed before storage |
| File uploads | Magic byte validation, MIME check, max 10MB, quarantine → scan → main bucket |
| CORS | Strict allowlist from `CORS_ORIGINS` env var |
| Rate limiting | Sliding window per IP+userId; Redis-backed in multi-replica setups |
| Security headers | Hono `secureHeaders()` (X-Frame-Options, CSP, HSTS) |
| S3 | Private buckets; assets served only via CloudFront OAC |
| Secrets | AWS Secrets Manager in production; `.env` locally (never committed) |

---

## Project Layout

```
src/
├── index.ts               # Server bootstrap (CORS, middleware, routes, shutdown)
├── config/env.ts          # Zod-validated env — process.exit(1) on startup failure
├── lib/
│   ├── db.ts              # Drizzle singleton
│   ├── jwt.ts             # Sign / verify access + refresh tokens
│   ├── redis.ts           # Optional Redis client (graceful in-memory fallback)
│   ├── circuit-breaker.ts # Open/half-open/closed circuit breaker
│   ├── s3.ts              # S3 upload, quarantine → main, CDN URL helpers
│   ├── email.ts           # Resend client + HTML email templates
│   └── logger.ts          # Pino (pretty dev / JSON prod)
├── middleware/
│   ├── auth.ts            # requireAuth / optionalAuth — Bearer JWT extraction
│   ├── rateLimit.ts       # Sliding window; RedisStore or MemoryStore
│   ├── logger.ts          # Per-request logging with requestId
│   └── errorHandler.ts    # Global error handler — typed JSON responses
├── routes/
│   ├── index.ts           # Mounts all routers + /docs Swagger UI
│   ├── auth.ts            # /auth/*
│   ├── items.ts           # /items/*
│   ├── ai.ts              # /ai/*
│   ├── matches.ts         # /matches/*
│   ├── claims.ts          # /claims/*
│   └── ucard.ts           # /ucard/*
├── services/
│   ├── auth.service.ts    # Google token verify, user upsert, token rotation
│   ├── items.service.ts   # Item CRUD, feed, vector search
│   ├── ai.service.ts      # Vision → embedding pipeline
│   ├── matching.service.ts# pgvector cosine search, match persistence, email
│   ├── storage.service.ts # Sharp processing, S3 quarantine pipeline
│   ├── claims.service.ts  # Claim submit, Argon2 verify, owner approval
│   └── ucard.service.ts   # UCard OCR, SPIRE ID hashing, user notification
├── openapi.ts             # OpenAPI 3.1 spec + Swagger UI HTML
├── types/index.ts         # AppVariables, TokenPayload
└── utils/
    ├── validate.ts        # zValidator wrapper → consistent 422 format
    ├── validators.ts      # Zod schemas for all request bodies
    └── helpers.ts         # Argon2, pagination, base64, response builders
```

---

## Response Format

**Success:**
```json
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 142, "hasMore": true } }
```

**Error:**
```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Invalid or expired access token" } }
```

**Validation error (422):**
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed", "details": { "title": ["Required"] } } }
```
