# FoundU Deployment Guide

For hackathon demos and production deployment.

## Overview

- **Backend**: Deploys to AWS ECS Fargate (via GitHub Actions on push to `main`)
- **Frontend**: Deploy to Vercel (recommended) or any Node.js host

---

## 1. Backend (AWS ECS)

### Prerequisites

- AWS account with ECR, ECS, and VPC
- GitHub OIDC provider configured for AWS
- GitHub repository secrets: `AWS_DEPLOY_ROLE_ARN`, `ECS_SUBNET_ID`, `ECS_SECURITY_GROUP_ID`

### Production environment variables

Configure these in your ECS task definition or secrets manager:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Min 32 chars |
| `JWT_REFRESH_SECRET` | Min 32 chars |
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `ALLOWED_EMAIL_DOMAIN` | `umass.edu` |
| `ARGON2_PEPPER` | Min 32 chars |
| `FRONTEND_URL` | Production frontend URL (e.g. `https://foundu.vercel.app`) |
| `CORS_ORIGINS` | `https://foundu.vercel.app` (match frontend) |
| `API_BASE_URL` | Public backend API URL |
| `AWS_*` | S3, CloudFront config |
| `GOOGLE_AI_API_KEY` | Gemini API key |
| `BREVO_API_KEY` | Email (Brevo) |
| `EMAIL_FROM` | Sender email |

### Deploy

Push to `main` branch. GitHub Actions will:

1. Run tests
2. Build Docker image
3. Push to ECR
4. Run DB migrations
5. Deploy to ECS
6. Roll back on failure

---

## 2. Frontend (Vercel)

### One-time setup

1. Go to [vercel.com](https://vercel.com) and import your GitHub repo
2. **Root Directory**: Set to `apps/frontend`
3. **Framework**: Next.js (auto-detected)
4. **Build Command**: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter foundu-frontend build`
5. **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`
6. **Output Directory**: `.next`

Or use the included `vercel.json` in `apps/frontend/` which configures the monorepo build.

### Environment variables (Vercel)

Add these in Project Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Your backend API URL (e.g. `https://api.foundu.app`) |
| `NEXTAUTH_URL` | Your Vercel app URL (e.g. `https://foundu.vercel.app`) |
| `NEXTAUTH_SECRET` | Random string (e.g. `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` | Same as backend |
| `GOOGLE_CLIENT_SECRET` | Same as backend |

### Google OAuth (production)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
2. Add authorized origin: `https://foundu.vercel.app` (your Vercel URL)
3. Add redirect URI: `https://foundu.vercel.app/api/auth/callback/google`

---

## 3. Backend CORS

Ensure `CORS_ORIGINS` in the backend `.env` includes your production frontend URL:

```
CORS_ORIGINS=https://foundu.vercel.app,https://your-custom-domain.com
```

---

## 4. Quick checklist for hackathon demo

- [ ] Backend env vars set in ECS
- [ ] Frontend env vars set in Vercel
- [ ] Google OAuth has production origins/redirects
- [ ] `FRONTEND_URL` and `CORS_ORIGINS` match frontend URL
- [ ] `NEXT_PUBLIC_API_URL` points to backend
- [ ] Push to `main` and verify both deploy
- [ ] Test: login → post found item → search → claim flow
