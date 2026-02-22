# Hosting FoundU on foundu.xyz

This guide walks you through deploying FoundU to the domain **foundu.xyz** (purchased from Spaceship).

## Architecture Overview

| Component   | Hosting  | URL              |
|-------------|----------|------------------|
| Frontend    | Vercel   | `https://foundu.xyz` |
| Backend API | Railway  | `https://api.foundu.xyz` |

You can substitute Railway with **Render** or **Fly.io** if you prefer; the DNS steps are similar.

---

## Prerequisites

- [ ] Domain **foundu.xyz** at Spaceship (already purchased)
- [ ] GitHub repo with FoundU code
- [ ] Supabase project (PostgreSQL + pgvector)
- [ ] AWS account (S3 + CloudFront for image storage)
- [ ] Google Cloud OAuth credentials
- [ ] Resend account (email)
- [ ] Google AI API key (Gemini)

---

## Part 1: Deploy Backend to Railway

### Step 1.1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your FoundU repo.
4. Railway will detect the monorepo. You need to configure it to deploy the **backend** only.

### Step 1.2: Configure Railway Service

1. In the project, click **+ New** → **GitHub Repo** (or use the existing service).
2. Open **Settings** → **Source**:
   - **Root Directory**: `apps/backend` (or leave root if using Docker)
   - **Build Command**: If root directory is repo root: use the existing Dockerfile path.
   - Or set **Root Directory** to repo root and **Dockerfile Path**: `apps/backend/Dockerfile`

   If Railway doesn't use the monorepo Dockerfile correctly, use **Root Directory** = `/` and **Dockerfile Path** = `apps/backend/Dockerfile`.

3. Open **Variables** and add all env vars from `.env.example`. Key production values:

   | Variable | Production value |
   |----------|------------------|
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |
   | `API_BASE_URL` | `https://api.foundu.xyz/api/v1` |
   | `FRONTEND_URL` | `https://foundu.xyz` |
   | `CORS_ORIGINS` | `https://foundu.xyz,https://www.foundu.xyz` |
   | `DATABASE_URL` | Your Supabase connection string |
   | (plus JWT, AWS, Google, Resend, etc.) |

4. In **Settings** → **Networking** → **Public Networking**, enable it. Railway will assign a `*.railway.app` URL.

### Step 1.3: Add Custom Domain on Railway

1. In **Settings** → **Networking** → **Custom Domain**, add: `api.foundu.xyz`
2. Railway will show a CNAME target, e.g. `your-service.up.railway.app`
3. **Do not configure Spaceship yet** — complete backend deploy first, then DNS.

### Step 1.4: Deploy

1. Trigger a deploy (push to main or use **Deploy**).
2. Verify `https://your-service.up.railway.app/health` returns OK.

---

## Part 2: Deploy Frontend to Vercel

### Step 2.1: Import Project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New** → **Project** → Import your FoundU repo.
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/frontend`
   - **Build Command**: `pnpm build` (or `cd ../.. && pnpm install && pnpm --filter foundu-frontend build`)
   - **Output Directory**: `.next` (default)

   Vercel may need the workspace root. If so, set **Root Directory** to `/` and override:
   - **Build Command**: `pnpm install && pnpm --filter foundu-frontend build`
   - **Output Directory**: `apps/frontend/.next`

### Step 2.2: Environment Variables

Add in **Settings** → **Environment Variables**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.foundu.xyz` |
| `NEXTAUTH_URL` | `https://foundu.xyz` |
| `NEXTAUTH_SECRET` | Generate: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Your OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your OAuth client secret |

### Step 2.3: Add Custom Domain on Vercel

1. In **Settings** → **Domains**, add: `foundu.xyz`
2. Vercel will also suggest `www.foundu.xyz` — add it.
3. Vercel will show DNS instructions (A record for apex, CNAME for www). **Keep this tab open** — you’ll use it in Part 3.

---

## Part 3: Configure DNS at Spaceship

You have two approaches:

### Option A: Use Vercel Nameservers (Recommended)

1. In Vercel **Domains**, when you add `foundu.xyz`, choose **Use Vercel Nameservers**.
2. Vercel will show: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`
3. In **Spaceship**:
   - Open your domain **foundu.xyz**
   - Go to **DNS** or **Nameservers**
   - Replace existing nameservers with:
     - `ns1.vercel-dns.com`
     - `ns2.vercel-dns.com`
4. In Vercel, add the `api` subdomain: **Domains** → Add `api.foundu.xyz`
5. Vercel will show a CNAME record. Because you’re using Vercel nameservers, you add this **in Vercel** (Domains → `api.foundu.xyz` → Configure).
6. For `api.foundu.xyz` you want it to point to **Railway**, not Vercel. So:
   - In Vercel, you typically only add `foundu.xyz` and `www.foundu.xyz`
   - For `api.foundu.xyz`, add a CNAME in Vercel DNS: `api` → `your-railway-service.up.railway.app`

   **Important:** If you use Vercel nameservers, all DNS is managed in Vercel. So:
   - Add `api.foundu.xyz` in Vercel Domains as a CNAME pointing to your Railway URL.

   Actually: Vercel Domains for `api.foundu.xyz` would try to serve the frontend. You need `api` to point to Railway.

   **Correct approach with Vercel nameservers:**
   - In Vercel → Project → Settings → Domains: add only `foundu.xyz` and `www.foundu.xyz`
   - In Vercel → Project → Settings → Domains, there may be a way to add “external” DNS. Or:
   - Use **Vercel Domains** (domains.vercel.com) → Add `foundu.xyz` → Use nameservers → Then in DNS Records add:
     - Type: CNAME, Name: `api`, Value: `your-railway-service.up.railway.app`

### Option B: Keep Spaceship DNS (Manual Records)

If you keep Spaceship as the DNS provider:

1. **Apex `foundu.xyz` (A record):**
   - Vercel provides IPs, e.g. `76.76.21.21`
   - In Spaceship DNS: Add A record, Name: `@`, Value: `76.76.21.21`

2. **www.foundu.xyz (CNAME):**
   - Add CNAME, Name: `www`, Value: `cname.vercel-dns.com`

3. **api.foundu.xyz (CNAME):**
   - Add CNAME, Name: `api`, Value: `your-railway-service.up.railway.app` (from Railway)

**Vercel’s current IPs** can be found in the Domains UI when you add the domain. Use the values Vercel displays.

---

## Part 4: User Steps (Spaceship + Google OAuth)

### Step 4.1: Spaceship — Add DNS Records

1. Log in at [spaceship.com](https://www.spaceship.com)
2. Open **Domains** → **foundu.xyz** → **DNS** or **Advanced DNS**
3. Add records per the table below (use Option B if you’re not switching to Vercel nameservers):

   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | A    | @    | `76.76.21.21` (verify in Vercel) | 3600 |
   | CNAME | www | `cname.vercel-dns.com` | 3600 |
   | CNAME | api | `your-railway-service.up.railway.app` | 3600 |

   **If using Vercel nameservers:** Change nameservers at Spaceship to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`, then add the `api` CNAME in Vercel’s DNS (if your plan supports it) or keep `api` in Spaceship until nameservers are updated.

### Step 4.2: Google OAuth — Authorized URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your OAuth client
2. Add:
   - **Authorized JavaScript origins:** `https://foundu.xyz`, `https://www.foundu.xyz`
   - **Authorized redirect URIs:** `https://foundu.xyz/api/auth/callback/google`, `https://www.foundu.xyz/api/auth/callback/google`

### Step 4.3: Wait for DNS Propagation

- Can take from a few minutes up to 48 hours
- Check with [dnschecker.org](https://dnschecker.org) for `foundu.xyz` and `api.foundu.xyz`

---

## Part 5: Verify

1. **Frontend:** `https://foundu.xyz` — app loads
2. **Backend health:** `https://api.foundu.xyz/health` — returns OK
3. **Login:** Sign in with Google (@umass.edu)
4. **API:** Feed, search, post flows work

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| 404 on foundu.xyz | DNS propagation; Vercel domain status |
| CORS errors | `CORS_ORIGINS` includes `https://foundu.xyz` |
| API 502/503 | Railway logs; env vars; DATABASE_URL |
| Login redirect fails | NEXTAUTH_URL, Google OAuth redirect URIs |
| Images don’t load | `next.config.js` remote patterns; CLOUDFRONT_DOMAIN |

---

## Alternative: Render Instead of Railway

1. Create a [Render](https://render.com) account and connect GitHub.
2. **New** → **Web Service** → select repo.
3. **Root Directory:** `apps/backend` (or use Docker)
4. Add env vars same as Railway.
5. Under **Custom Domain**, add `api.foundu.xyz`.
6. In Spaceship, add CNAME: `api` → `your-service.onrender.com`.
