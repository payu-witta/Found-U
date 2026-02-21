# FoundU Backend

Node.js + TypeScript API server for the FoundU campus lost-and-found platform. Handles authentication, item management, AI-powered matching, and UCard recovery.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Hono](https://hono.dev) on `@hono/node-server` |
| Language | TypeScript (ESM, NodeNext) |
| Database | Supabase PostgreSQL + pgvector |
| ORM | Drizzle ORM + postgres.js |
| AI | Google Gemini 1.5 Flash + text-embedding-004 |
| Storage | AWS S3 (quarantine + main) + CloudFront CDN |
| Email | Resend |
| Auth | Google OAuth → JOSE JWT (HS256) |
| Hashing | Argon2id + server-side pepper |

---

## Project Layout

```
src/
├── index.ts               # Server bootstrap (CORS, middleware, routes, shutdown)
├── config/
│   └── env.ts             # Zod-validated env vars — fails fast on startup
├── lib/
│   ├── db.ts              # Drizzle client singleton
│   ├── jwt.ts             # Sign / verify access + refresh tokens
│   ├── s3.ts              # S3 upload, quarantine → main move, CDN URL helpers
│   ├── email.ts           # Resend client + HTML email templates
│   └── logger.ts          # Pino logger (pretty in dev, JSON in prod)
├── middleware/
│   ├── auth.ts            # requireAuth / optionalAuth — extracts JWT from Bearer header
│   ├── rateLimit.ts       # In-memory sliding window rate limiter (per IP + user)
│   ├── logger.ts          # Per-request logging with requestId
│   └── errorHandler.ts    # Global Hono error handler — maps errors to typed JSON
├── routes/
│   ├── index.ts           # Mounts all routers under /api/v1
│   ├── auth.ts            # POST /auth/login|refresh|logout  GET /auth/me
│   ├── items.ts           # POST /items/lost|found  GET /items/feed|search  PATCH /items/:id/status
│   ├── ai.ts              # POST /ai/vision-analysis|generate-embedding
│   ├── matches.ts         # GET /matches/:itemId  PATCH /matches/:id/status
│   ├── claims.ts          # POST /claims/create|verify  GET /claims/item/:itemId
│   └── ucard.ts           # POST /ucard/submit  GET /ucard/:recoveryId
├── services/
│   ├── auth.service.ts    # Google token verification, user upsert, token rotation
│   ├── items.service.ts   # Item creation, feed pagination, vector search
│   ├── ai.service.ts      # AI pipeline orchestration (vision → embedding → question)
│   ├── matching.service.ts# Cosine similarity search, match persistence, notifications
│   ├── storage.service.ts # Image validation, sharp processing, quarantine → scan → main
│   ├── claims.service.ts  # Claim submission, Argon2 answer hashing, owner approval
│   └── ucard.service.ts   # UCard OCR, SPIRE ID hashing, owner notification
├── types/
│   └── index.ts           # Shared types: AppVariables (Hono context), API response shapes
└── utils/
    ├── validate.ts        # Wrapper around zValidator with consistent 422 error format
    ├── validators.ts      # Zod schemas for all request bodies + file validation
    └── helpers.ts         # Argon2 hash/verify, pagination, base64, response builders
```

---

## Module Relationships

```
index.ts
  └── mounts routes/index.ts
        ├── auth.ts ──────────── auth.service.ts
        │                              └── lib/jwt.ts
        │                              └── lib/db.ts
        ├── items.ts ─────────── items.service.ts
        │                              ├── storage.service.ts ── lib/s3.ts
        │                              ├── ai.service.ts ─────── @foundu/ai
        │                              └── matching.service.ts
        │                                     ├── lib/db.ts
        │                                     └── lib/email.ts
        ├── ai.ts ────────────── ai.service.ts ───── @foundu/ai
        ├── matches.ts ───────── matching.service.ts
        ├── claims.ts ────────── claims.service.ts
        │                              ├── lib/db.ts
        │                              └── lib/email.ts
        └── ucard.ts ─────────── ucard.service.ts
                                       ├── storage.service.ts
                                       ├── @foundu/ai  (UCard OCR)
                                       ├── utils/helpers.ts  (Argon2)
                                       └── lib/email.ts

Workspace packages (imported by services):
  @foundu/db  →  Drizzle schema, type exports
  @foundu/ai  →  Gemini client, vision, embeddings, matching constants, UCard OCR
```

---

## Pipelines

### 1. Authentication

```
Frontend (Google OAuth)
  → sends Google ID token to POST /auth/login
      → verifyGoogleIdToken()  — validates with Google tokeninfo API
      → enforce @umass.edu domain
      → upsert user in DB (email, google_id, display_name, avatar)
      → createTokenPair()
            accessToken  — HS256 JWT, 15 min TTL
            refreshToken — HS256 JWT, 7 day TTL
      → store SHA-256(refreshToken) hash in refresh_tokens table
      ← return { user, accessToken, refreshToken, expiresIn }

Token refresh:
  POST /auth/refresh
    → verify refreshToken JWT signature
    → look up hash in DB (not revoked, not expired)
    → revoke old token (set revoked_at)
    → issue new token pair (rotation)
    ← return new { accessToken, refreshToken, expiresIn }
```

### 2. Lost Item Posting

```
POST /items/lost  (multipart/form-data)
  → requireAuth middleware validates Bearer JWT
  → extract text fields (title, description, category, location, dateLost)
  → if image attached:
      → validateImageMagicBytes()        — prevents MIME spoofing
      → sharp: resize to ≤2048px, JPEG 85%, generate 400px WebP thumbnail
      → upload both to S3 quarantine bucket
      → simulateVirusScan()              — EICAR check (replace with ClamAV in prod)
      → moveToMainBucket()               — copy quarantine → main, delete quarantine
      → analyzeItemPipeline():
            parallel:
              analyzeItemImage()         — Gemini 1.5 Flash vision analysis
                                           returns: objects, colors, brand, condition,
                                                    distinctiveFeatures, category, confidence
              generateVerificationQuestion() — Gemini asks about a non-public detail
            then:
              composeEmbeddingText()     — builds rich text from title + AI metadata
              generateEmbedding()        — text-embedding-004 → float[768]
  → INSERT item into DB with embedding
  → runMatchingForItem() [fire and forget]
      → pgvector cosine similarity vs all active found items
      → cosine_similarity >= 0.8 → upsert into matches table
      → send email notification to lost-item owner
      → create in-app notification
  ← return created item
```

### 3. Found Item Posting

Same as lost item, plus:

```
  → enforce business rules:
      foundMode = 'keeper'  →  contactEmail required
      isAnonymous = true    →  rejected (422)
  → generateVerificationQuestion() result stored in ai_metadata
    (used later when a claim is submitted)
  → runMatchingForItem() compares against all active lost items
```

### 4. AI Matching Engine

```
runMatchingForItem(itemId, type):
  → fetch item embedding from DB
  → pgvector query:
      SELECT id, similarity
      FROM items
      WHERE type = oppositeType
        AND status = 'active'
        AND embedding IS NOT NULL
        AND (1 - (embedding <=> query_embedding)) >= 0.8
      ORDER BY embedding <=> query_embedding
      LIMIT 5
  → for each match above threshold:
      → INSERT OR UPDATE matches table (lost_item_id, found_item_id, similarity_score)
      → notifyMatchFound():
            → send email to lost item owner with match details + link
            → INSERT notification row for in-app display
```

### 5. Semantic Search

```
GET /items/search?q=blue+airpods&type=found
  → generateEmbedding(q)          — text-embedding-004 on query string
  → pgvector ORDER BY <=> (cosine distance)
  ← ranked results by visual/semantic similarity

POST /items/search/image  (reverse image search)
  → analyzeItemImage(imageBase64) — Gemini describes image
  → generateEmbedding(description)
  → pgvector ORDER BY <=>
  ← visually similar items
```

### 6. Ownership Verification (Claims)

```
POST /claims/create
  → load item, check: type = found, status = active, not own item, no duplicate
  → hashAnswer(verificationAnswer)  — Argon2id + pepper
  → INSERT claim with answer hash
  → email item owner with verification question + claim link

POST /claims/verify  (item owner only)
  → load claim, verify ownership
  → action = 'approve':
      → UPDATE claim status = 'approved'
      → UPDATE item status = 'resolved'
      → notify claimant
  → action = 'reject':
      → UPDATE claim status = 'rejected'
      → notify claimant
```

### 7. UCard Recovery

```
POST /ucard/submit  (multipart image)
  → sharp: upscale to 1200px, sharpen for readability
  → upload to S3 quarantine → scan → main
  → extractUCardData():
      → Gemini 1.5 Flash reads card image
      → extracts: spireId (8-digit), lastName, firstName
      → returns isUMassCard flag
  → validate SPIRE ID format (/^\d{8}$/)
  → hashSensitiveData(spireId):
      → Argon2id with server-side pepper
      → raw SPIRE ID is NEVER stored or logged
  → INSERT ucard_recoveries (spire_id_hash, last_name_lower, image_url)
  → tryMatchAndNotifyUser():
      → search users by last name substring match in email
      → send email to matching users
      → INSERT in-app notification
  ← return { recoveryId, extracted, matched, message }
```

---

## Security Model

| Concern | Implementation |
|---------|---------------|
| Auth | Google OAuth ID token verified via tokeninfo API; domain restricted to @umass.edu |
| JWT | HS256, 15min access tokens; 7-day refresh tokens with rotation and DB revocation |
| SPIRE ID storage | Argon2id (65MB memory, 3 iterations, 4 threads) + server-side pepper; raw ID never stored |
| Verification answers | Argon2id hashed before storage |
| File uploads | Magic byte check, MIME validation, max 10MB, quarantine → virus scan → main bucket |
| CORS | Strict allowlist from `CORS_ORIGINS` env var |
| Rate limiting | Sliding window per IP+userId; stricter limits on upload and UCard endpoints |
| Security headers | Hono `secureHeaders()` (X-Frame-Options, CSP, etc.) |
| S3 | Both buckets are private; assets served only through CloudFront OAC |

---

## Running Locally

```bash
# 1. Install dependencies (from monorepo root)
pnpm install

# 2. Set up environment
cp ../../.env.example .env
# Fill in all values in .env

# 3. Run migration in Supabase SQL editor
#    File: packages/db/migrations/001_initial.sql
#    (Enable pgvector extension in Supabase dashboard first)

# 4. Start dev server
pnpm dev
# Server starts on http://localhost:3001
```

**Building for production:**
```bash
# From monorepo root — build packages first, then backend
pnpm --filter @foundu/db build
pnpm --filter @foundu/ai build
pnpm --filter @foundu/backend build

# Start
node dist/index.js
```

---

## API Reference

All routes are prefixed with `/api/v1`. Authenticated routes require `Authorization: Bearer <accessToken>`.

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | — | Exchange Google ID token for JWT pair |
| `POST` | `/auth/refresh` | — | Rotate refresh token |
| `POST` | `/auth/logout` | ✓ | Revoke refresh token |
| `GET` | `/auth/me` | ✓ | Current user profile |

### Items
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/items/lost` | ✓ | Report a lost item (multipart) |
| `POST` | `/items/found` | ✓ | Report a found item (multipart) |
| `GET` | `/items/feed` | optional | Paginated item feed |
| `GET` | `/items/search?q=` | optional | Semantic text search |
| `POST` | `/items/search/image` | optional | Reverse image search (multipart) |
| `GET` | `/items/:id` | optional | Get single item |
| `PATCH` | `/items/:id/status` | ✓ | Update item status (owner only) |

### AI
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/ai/vision-analysis` | ✓ | Analyze image, return metadata |
| `POST` | `/ai/generate-embedding` | ✓ | Generate text embedding vector |

### Matches
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/matches/:itemId` | ✓ | Top matches for an item (owner only) |
| `PATCH` | `/matches/:matchId/status` | ✓ | Confirm or dismiss a match |

### Claims
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/claims/create` | ✓ | Submit ownership claim with verification answer |
| `POST` | `/claims/verify` | ✓ | Approve or reject a claim (item owner only) |
| `GET` | `/claims/item/:itemId` | ✓ | List claims for an item (owner only) |

### UCard
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/ucard/submit` | ✓ | Submit found UCard photo |
| `GET` | `/ucard/:recoveryId` | ✓ | Check UCard recovery status |

---

## Response Format

Every endpoint returns a consistent JSON envelope:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 142, "hasMore": true }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired access token"
  }
}
```

**Validation error (422):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "title": ["Required"],
      "foundMode": ["Invalid enum value"]
    }
  }
}
```
