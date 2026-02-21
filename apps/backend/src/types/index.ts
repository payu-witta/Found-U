import type { Context } from 'hono';
import type { TokenPayload } from '../lib/jwt.js';

// Shared Hono app variables type — use this in every new Hono<AppVariables>() call
export type AppVariables = {
  Variables: {
    user: TokenPayload;
    requestId: string;
  };
};

// ── Hono context with auth ─────────────────────────────────────────────────────
export type AppContext = Context<{
  Variables: {
    user: TokenPayload;
    requestId: string;
  };
}>;

// ── API Response shapes ───────────────────────────────────────────────────────
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ── Item types ────────────────────────────────────────────────────────────────
export type ItemType = 'lost' | 'found';
export type ItemStatus = 'active' | 'resolved' | 'expired';
export type FoundMode = 'left_at_location' | 'keeper';

export interface ItemWithUser {
  id: string;
  userId: string;
  type: ItemType;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  dateOccurred: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  status: ItemStatus;
  foundMode: FoundMode | null;
  contactEmail: string | null;
  isAnonymous: boolean;
  aiMetadata: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface MatchWithItems {
  id: string;
  similarityScore: number;
  status: string;
  createdAt: string;
  lostItem: ItemWithUser;
  foundItem: ItemWithUser;
}

// ── Feed ──────────────────────────────────────────────────────────────────────
export interface FeedQueryParams {
  page?: number;
  limit?: number;
  type?: ItemType;
  category?: string;
  location?: string;
  status?: ItemStatus;
}
