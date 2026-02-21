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
- **Backend:** Node.js + Hono/Express (separate repo/service)
- **Database:** Supabase PostgreSQL + pgvector
- **AI:** Gemini 1.5 Flash + text-embedding-004
- **Storage:** AWS S3 + CloudFront CDN

## Project Structure

```
apps/
  frontend/          # Next.js 14 frontend
    src/
      app/           # App Router pages (feed, search, post, item, claim, etc.)
      components/    # UI primitives, layout, forms, items, matches, auth
      lib/
        api/         # Typed API client (items, ai, matches, claims)
        hooks/       # React Query hooks
        store/       # Zustand UI store
        types/       # TypeScript types + Zod schemas
        utils/       # Helpers (cn, timeAgo, image compression)
```

## Local Development

### Prerequisites

- Node.js 18+
- A Google OAuth client (for authentication)

### 1. Install Dependencies

```bash
cd apps/frontend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
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

### 3. Run Dev Server

```bash
npm run dev
```

App runs at **http://localhost:3000**.

### 4. Production Build

```bash
npm run build    # type-check + compile
npm run start    # serve production build on :3000
npm run lint     # check for lint issues
```

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
