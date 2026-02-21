import crypto from 'crypto';
import argon2 from 'argon2';
import { env } from '../config/env.js';

// ── Argon2id hashing ──────────────────────────────────────────────────────────
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

/**
 * Hash sensitive data (e.g., SPIRE ID) with Argon2id + server-side pepper.
 * The pepper is mixed in before hashing so even a DB dump + pepper leak
 * requires breaking argon2id to reverse.
 */
export async function hashSensitiveData(data: string): Promise<string> {
  const peppered = `${env.ARGON2_PEPPER}:${data}`;
  return argon2.hash(peppered, ARGON2_OPTIONS);
}

export async function verifySensitiveData(data: string, hash: string): Promise<boolean> {
  const peppered = `${env.ARGON2_PEPPER}:${data}`;
  return argon2.verify(hash, peppered);
}

/**
 * Hash an answer string for verification purposes.
 */
export async function hashAnswer(answer: string): Promise<string> {
  const normalized = answer.trim().toLowerCase();
  return hashSensitiveData(normalized);
}

export async function verifyAnswer(answer: string, hash: string): Promise<boolean> {
  const normalized = answer.trim().toLowerCase();
  return verifySensitiveData(normalized, hash);
}

// ── Random utilities ──────────────────────────────────────────────────────────
export function generateId(): string {
  return crypto.randomUUID();
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a refresh token for storage (SHA-256, fast and sufficient since
 * the token itself is already 256-bit random).
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Pagination helpers ────────────────────────────────────────────────────────
export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    hasMore: page * limit < total,
    totalPages: Math.ceil(total / limit),
  };
}

// ── Image processing ──────────────────────────────────────────────────────────
export async function bufferToBase64(buffer: Buffer): Promise<string> {
  return buffer.toString('base64');
}

export function detectMimeType(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp';
  return 'image/jpeg'; // fallback
}

// ── Item serialization ────────────────────────────────────────────────────────
// Transforms Drizzle camelCase rows to the snake_case shape the frontend expects.
export function serializeItem(row: {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  dateOccurred: string | null;
  imageUrl: string | null;
  foundMode: string | null;
  contactEmail: string | null;
  status: string;
  aiMetadata: {
    detectedObjects?: string[];
    colors?: string[];
    brand?: string | null;
    condition?: string | null;
    [key: string]: unknown;
  } | null;
  createdAt: Date;
  updatedAt?: Date | null;
  userDisplayName?: string | null;
}) {
  return {
    id: row.id,
    user_id: row.userId,
    type: row.type,
    title: row.title,
    description: row.description ?? '',
    category: row.category ?? 'other',
    location: row.location ?? '',
    date_occurred: row.dateOccurred ?? '',
    image_url: row.imageUrl ?? '',
    found_mode: row.foundMode ?? undefined,
    contact_email: row.contactEmail ?? undefined,
    status: row.status,
    ai_metadata: row.aiMetadata
      ? {
          detected_objects: row.aiMetadata.detectedObjects ?? [],
          color: row.aiMetadata.colors?.[0] ?? undefined,
          brand: row.aiMetadata.brand ?? undefined,
          condition: row.aiMetadata.condition ?? undefined,
        }
      : undefined,
    created_at: row.createdAt.toISOString(),
    updated_at: (row.updatedAt ?? row.createdAt).toISOString(),
    user_display_name: row.userDisplayName ?? undefined,
  };
}

// ── Response helpers ──────────────────────────────────────────────────────────
export function successResponse<T>(data: T, meta?: Record<string, unknown>) {
  return { success: true as const, data, ...(meta ? { meta } : {}) };
}

export function errorResponse(code: string, message: string, details?: unknown) {
  return { success: false as const, error: { code, message, ...(details ? { details } : {}) } };
}
