# FoundU

Submission for the Hack(H)er413 2026 hackathon.

FoundU is a campus-focused lost-and-found platform designed to intelligently match reported lost items with found item submissions. Users upload a photo, and the AI pipeline analyzes it, generates a semantic embedding, and automatically surfaces the best matches — helping reunite owners with their belongings quickly and securely.

## Authors

- **Payu Wittawatolarn**
  GitHub: https://github.com/payu-witta

- **Varot (Avin) Vipanurat**
  GitHub: https://github.com/avin-vip

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, Framer Motion, Lucide React icons
- **Auth:** NextAuth.js with Google OAuth (restricted to @umass.edu), backend JWT access/refresh tokens (jose)
- **State:** TanStack React Query + Zustand
- **Validation:** Zod (frontend + backend)
- **Backend:** Node.js + Hono, Drizzle ORM, Pino logger
- **Database:** Supabase PostgreSQL + pgvector (HNSW indexing)
- **AI:** Gemini 2.5 Flash (vision analysis) + Gemini Embedding 001 (768-dim semantic embeddings)
- **Storage:** AWS S3 (dual-bucket quarantine/main) + CloudFront CDN, Sharp for image processing
- **Email:** Brevo transactional email
- **Testing:** Vitest + Codecov coverage
- **Infrastructure:** Terraform (ECS, S3, CloudFront modules), Docker, GitHub Actions CI/CD
- **Package Manager:** pnpm 9+ (workspace monorepo)

## Project Structure

```
.
├── apps/
│   ├── frontend/             # Next.js 14 frontend
│   │   └── src/
│   │       ├── app/              # App Router pages & layouts
│   │       │   ├── (app)/            # Authenticated route group
│   │       │   │   ├── feed/         # Item feed with filters
│   │       │   │   ├── post/lost/    # Report a lost item
│   │       │   │   ├── post/found/   # Report a found item
│   │       │   │   ├── search/       # Semantic + image search
│   │       │   │   ├── item/[id]/    # Item detail page
│   │       │   │   ├── matches/[id]/ # AI matches for an item
│   │       │   │   ├── claim/[id]/   # Claim submission
│   │       │   │   ├── ucard/        # UCard recovery flow
│   │       │   │   ├── profile/      # User profile & items
│   │       │   │   └── notifications/# Notification center
│   │       │   ├── api/auth/         # NextAuth.js route handler
│   │       │   └── login/            # Login page
│   │       ├── components/       # UI primitives, layout, forms, items, matches, auth, search
│   │       ├── lib/              # API client, hooks, store, types, utils, motion config
│   │       └── styles/           # Global CSS (TailwindCSS)
│   └── backend/              # Hono API server
│       └── src/
│           ├── routes/           # auth, items, ai, matches, claims, ucard, notifications
│           ├── services/         # Business logic (ai, auth, claims, items, matching, storage, ucard)
│           ├── middleware/       # auth, errorHandler, logger, rateLimit
│           ├── lib/              # db, s3, redis, jwt, email, circuit-breaker, logger
│           ├── jobs/             # Scheduled tasks (claims cleanup)
│           ├── config/           # Environment config
│           ├── utils/            # Helpers, validation
│           ├── types/            # Shared type definitions
│           └── __tests__/        # Contract, route, and unit tests
├── packages/
│   ├── ai/                   # @foundu/ai — Gemini vision, embeddings, matching, UCard OCR, retry
│   └── db/                   # @foundu/db — Drizzle ORM schema, client, migrations
├── infrastructure/
│   ├── docker/               # docker-compose + LocalStack init
│   └── terraform/            # AWS modules (ECS, S3, CloudFront)
├── scripts/                  # dev.sh, backfill-embeddings, test-gemini-models
├── docs/                     # Deployment documentation
├── pnpm-workspace.yaml       # Workspace config
├── tsconfig.base.json        # Shared TypeScript config
└── .env.example              # Root environment variables template
```

## Local Development

### Prerequisites

- **Node.js 20+**
- **pnpm 9+** (`npm install -g pnpm`)
- A Google OAuth client (for authentication)

### 1. Install Dependencies

All commands run from the **repository root**. This is a pnpm workspace — do **not** use `npm install` in individual packages.

```bash
pnpm install
```

### 2. Configure Environment

**Root `.env`** (backend + shared packages):

```bash
cp .env.example .env
```

Edit `.env` and fill in your real values for database, AWS, AI, auth, and email keys. See `.env.example` for all required variables.

**Frontend `.env`** (Next.js specific):

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

Edit `apps/frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=any-random-string-for-local-dev
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
```

**Google OAuth setup:**

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Authorized origin: `http://localhost:3000`
4. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### 3. Quick Start (All-in-One)

From the repo root, run the dev startup script — it installs deps, builds shared packages, and starts both servers:

```bash
bash scripts/dev.sh
```

This runs all the steps below automatically. Frontend at `http://localhost:3000`, backend at `http://localhost:3001`. Press `Ctrl+C` to stop both.

### 4. Manual Start (Step-by-Step)

If you prefer to run things individually:

```bash
# Build shared packages (required before running backend)
pnpm --filter @foundu/db build
pnpm --filter @foundu/ai build

# Start backend (terminal 1)
pnpm --filter @foundu/backend dev

# Start frontend (terminal 2)
pnpm --filter foundu-frontend dev
```

### 5. Production Build

**Frontend:**

```bash
pnpm --filter foundu-frontend build    # TypeScript check + Next.js compile
pnpm --filter foundu-frontend start    # Serve production build on :3000
```

**Backend:**

```bash
pnpm --filter @foundu/backend build    # Compile TypeScript
pnpm --filter @foundu/backend start    # Run compiled output
```

### 6. Linting & Type Checking

```bash
pnpm --filter foundu-frontend lint         # ESLint (frontend)
pnpm --filter @foundu/backend typecheck    # tsc --noEmit (backend)
```

### 7. Testing

```bash
pnpm --filter @foundu/backend test             # Run all tests
pnpm --filter @foundu/backend test:watch       # Watch mode
pnpm --filter @foundu/backend test:coverage    # With coverage report
```

### 8. Database Migrations

```bash
pnpm db:generate    # Generate new migration from schema changes
pnpm db:migrate     # Apply pending migrations
```

## CI / CD

### CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push to `main`/`dev` and on PRs to `main`. Steps:

1. `pnpm install --frozen-lockfile`
2. Build workspace packages (`@foundu/db`, `@foundu/ai`)
3. TypeCheck backend
4. Run backend tests
5. Upload coverage to Codecov
6. Build Docker image (push events only, no ECR push)

No secrets required for CI.

### Deploy Pipeline (`.github/workflows/deploy.yml`)

Runs on pushes to `main` only. Deploys the backend to AWS ECS via OIDC with automatic rollback on failure.

Steps: install → build → test → push to ECR → run DB migrations → deploy to ECS → rollback if unstable.

**Required GitHub repository secrets** (Settings > Secrets and variables > Actions):

| Secret | Description |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | IAM role ARN for GitHub OIDC (e.g. `arn:aws:iam::123456789:role/foundu-deploy`) |
| `ECS_SUBNET_ID` | VPC subnet ID for ECS Fargate tasks |
| `ECS_SECURITY_GROUP_ID` | Security group ID for ECS tasks |

**AWS OIDC prerequisite:** You must configure an IAM OIDC identity provider for GitHub Actions in your AWS account before the deploy workflow can assume the role. This replaces static AWS access keys.

## Testing Each Flow

| Flow | URL | What to verify |
|---|---|---|
| Login | `/login` | Google sign-in, @umass.edu restriction |
| Feed | `/feed` | Item grid, filter tabs (All/Lost/Found), category/location filters, sorting, infinite scroll |
| Post Lost | `/post/lost` | Photo upload, AI vision analysis step, editable metadata, submit |
| Post Found | `/post/found` | Mode toggle (left at location vs keeping), contact email, anonymous option |
| Search | `/search` | Semantic text search, reverse image search |
| Item Detail | `/item/:id` | Image, AI metadata card, matches list, claim button, status updates |
| Matches | `/matches/:id` | AI-ranked matches with similarity scores, confirm/reject actions |
| Claim | `/claim/:id` | Claim preview, verification question, submission |
| UCard | `/ucard` | UCard photo upload, SPIRE ID extraction, match/no-match result |
| Profile | `/profile` | User info, posted items, sign out |
| Notifications | `/notifications` | Notification list, read/unread state, delete actions |

## API Endpoints (Backend)

The frontend consumes these endpoints (backend must be running separately). API docs available at `/docs`.

**Auth**

| Endpoint | Method | Purpose |
|---|---|---|
| `/auth/login` | POST | Verify Google ID token, issue JWT pair |
| `/auth/refresh` | POST | Exchange refresh token for new token pair |
| `/auth/logout` | POST | Revoke refresh token |
| `/auth/me` | GET | Get current user profile |

**Items**

| Endpoint | Method | Purpose |
|---|---|---|
| `/items/feed` | GET | Paginated item feed (filter by type, category, location, status) |
| `/items/search?q=` | GET | Semantic text search via vector similarity |
| `/items/search/image` | POST | Reverse image search |
| `/items/lost` | POST | Report a lost item (multipart/form-data) |
| `/items/found` | POST | Report a found item (multipart/form-data) |
| `/items/me` | GET | Get authenticated user's items |
| `/items/:id` | GET | Get single item by ID |
| `/items/:id/status` | PATCH | Update item status (owner only) |

**AI**

| Endpoint | Method | Purpose |
|---|---|---|
| `/ai/vision-analysis` | POST | Analyze item image (category, colors, brand, features) |
| `/ai/generate-embedding` | POST | Generate text embedding vector |

**Matches**

| Endpoint | Method | Purpose |
|---|---|---|
| `/matches/:itemId` | GET | Get AI-ranked matches for an item (owner only) |
| `/matches/:matchId/status` | PATCH | Confirm or reject a match |

**Claims**

| Endpoint | Method | Purpose |
|---|---|---|
| `/claims/create` | POST | Submit a claim with verification answer |
| `/claims/verify` | POST | Approve or reject a claim (item owner) |
| `/claims/item/:itemId` | GET | Get all claims for an item (owner only) |
| `/claims/:itemId/preview` | GET | Get claim preview for an item |
| `/claims/:itemId` | POST | Submit claim for an item |

**UCard**

| Endpoint | Method | Purpose |
|---|---|---|
| `/ucard/report-lost` | POST | Report a lost UCard (SPIRE ID stored as Argon2 hash) |
| `/ucard/submit` | POST | Submit a found UCard photo for OCR matching |
| `/ucard/:recoveryId` | GET | Check UCard recovery status |

**Notifications**

| Endpoint | Method | Purpose |
|---|---|---|
| `/notifications` | GET | List user notifications (max 50) |
| `/notifications/unread-count` | GET | Get unread notification count |
| `/notifications/:id/read` | PATCH | Mark notification as read |
| `/notifications/:id` | DELETE | Delete a notification |
| `/notifications/all` | DELETE | Delete all notifications |
