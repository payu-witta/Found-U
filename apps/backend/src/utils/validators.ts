import { z } from 'zod';
import { env } from '../config/env.js';

// ── Common validators ─────────────────────────────────────────────────────────
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ── Auth schemas ──────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ── Item schemas ──────────────────────────────────────────────────────────────
export const ITEM_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Accessories',
  'Books',
  'Keys',
  'Cards',
  'Bags',
  'Sports',
  'Musical Instruments',
  'Other',
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const createLostItemSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  category: z.enum(ITEM_CATEGORIES).optional(),
  location: z.string().max(255).optional(),
  dateLost: z.string().date().optional(),
});

export const createFoundItemSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  category: z.enum(ITEM_CATEGORIES).optional(),
  location: z.string().max(255).optional(),
  dateFound: z.string().date().optional(),
  foundMode: z.enum(['left_at_location', 'keeper']),
  contactEmail: z.string().email().optional(),
  isAnonymous: z.coerce.boolean().default(false),
});

export const feedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(['lost', 'found']).optional(),
  category: z.enum(ITEM_CATEGORIES).optional(),
  location: z.string().max(255).optional(),
  status: z.enum(['active', 'resolved', 'expired']).default('active'),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  type: z.enum(['lost', 'found']).optional(),
  category: z.enum(ITEM_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ── Claim schemas ─────────────────────────────────────────────────────────────
export const createClaimSchema = z.object({
  itemId: uuidSchema,
  verificationAnswer: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
});

export const verifyClaimSchema = z.object({
  claimId: uuidSchema,
  action: z.enum(['approve', 'reject']),
});

// ── File validation ────────────────────────────────────────────────────────────
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export function validateFileUpload(
  file: File | { size: number; type: string; name: string },
): { valid: boolean; error?: string } {
  const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;

  if (file.size > maxBytes) {
    return { valid: false, error: `File size exceeds ${env.MAX_FILE_SIZE_MB}MB limit` };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Check magic bytes to verify actual file type (prevents MIME spoofing).
 */
export function validateImageMagicBytes(buffer: Buffer): boolean {
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  )
    return true;
  // HEIC/HEIF: ftyp box at offset 4
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return true;

  return false;
}

export function isUMassEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${env.ALLOWED_EMAIL_DOMAIN}`);
}
