# FoundU

Submission for the Hack(H)er413 2026 hackathon.

FoundU is a campus-focused lost-and-found platform designed to intelligently match reported lost items with found item submissions. Users provide structured details and optional images, and the system ranks potential matches to help reunite owners with their belongings quickly and securely.

## Authors

- **Payu Wittawatolarn**
  GitHub: https://github.com/payu-witta

- **Varot (Avin) Vipanurat**
  GitHub: https://github.com/avin-vip

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, Framer Motion
- **Auth:** NextAuth.js with Google OAuth (restricted to @umass.edu)
- **State:** TanStack React Query + Zustand
- **Validation:** Zod
- **Backend:** Node.js + Hono/Express
- **Database:** Supabase PostgreSQL + pgvector
- **AI:** Gemini 1.5 Flash + text-embedding-004
- **Storage:** AWS S3 + CloudFront CDN
- **Package Manager:** pnpm (workspace monorepo)

## Project Structure

```
.
├── apps/
│   ├── frontend/        # Next.js 14 frontend
│   │   └── src/
│   │       ├── app/         # App Router pages
│   │       ├── components/  # UI primitives, layout, forms, items, matches, auth
│   │       └── lib/         # API client, hooks, store, types, utils
│   └── backend/         # Node.js API server
├── packages/            # Shared workspace packages (@foundu/db, @foundu/ai)
├── pnpm-workspace.yaml  # Workspace config
├── pnpm-lock.yaml       # Single lockfile for all packages
└── .env.example         # Root environment variables template
```

## Local Development

### Prerequisites

- **Node.js 20+**
- **pnpm** (`npm install -g pnpm`)
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

Edit `.env` and fill in your real values for database, AWS, AI, and auth keys. See `.env.example` for all required variables.

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

## CI / CD

### CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push to `main`/`dev` and on PRs to `main`. Steps:

1. `pnpm install --frozen-lockfile`
2. Build workspace packages (`@foundu/db`, `@foundu/ai`)
3. TypeCheck backend
4. Run backend tests
5. Build Docker image (push events only, no ECR push)

No secrets required for CI.

### Deploy Pipeline (`.github/workflows/deploy.yml`)

Runs on pushes to `main` only. Deploys the backend to AWS ECS via OIDC.

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
| Feed | `/feed` | Item grid, filter tabs (All/Lost/Found), infinite scroll |
| Post Lost | `/post/lost` | Photo upload, AI analysis step, editable metadata, submit |
| Post Found | `/post/found` | Mode toggle (left at location vs keeping), contact email |
| Search | `/search` | Semantic text search, reverse image search |
| Item Detail | `/item/:id` | Image, AI metadata card, matches list, claim button |
| Claim | `/claim/:id` | Message form, verification question, result status |
| UCard | `/ucard` | UCard photo upload, match/no-match result |
| Profile | `/profile` | User info, posted items, sign out |
| Notifications | `/notifications` | Notification list, read/unread state |

## API Endpoints (Backend)

The frontend consumes these endpoints (backend must be running separately):

| Endpoint | Method | Purpose |
|---|---|---|
| `/auth/login` | POST | Authenticate user |
| `/items/feed` | GET | Paginated item feed |
| `/items/search?q=` | GET | Semantic search |
| `/items/lost` | POST | Post a lost item |
| `/items/found` | POST | Post a found item |
| `/ai/vision-analysis` | POST | AI image analysis |
| `/matches/:itemId` | GET | Get AI similarity matches |
| `/claims/create` | POST | Submit a claim |
| `/claims/verify` | POST | Verify ownership |
