import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { uploadToQuarantine, moveToMainBucket, generateItemKey, generateUCardKey } from '../lib/s3.js';
import { validateImageMagicBytes, validateFileUpload } from '../utils/validators.js';
import { bufferToBase64, detectMimeType } from '../utils/helpers.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { HTTPException } from 'hono/http-exception';

export interface ProcessedUpload {
  key: string;
  cdnUrl: string;
  thumbnailKey?: string;
  thumbnailCdnUrl?: string;
  base64: string;
  mimeType: string;
  originalSize: number;
  processedSize: number;
}

/**
 * Process, validate, and upload an item image.
 * Steps:
 * 1. Validate MIME type and size
 * 2. Check magic bytes
 * 3. Compress with sharp
 * 4. Upload to quarantine bucket
 * 5. Simulate scan (in production wire up ClamAV/VirusTotal)
 * 6. Move to main bucket
 */
export async function processAndUploadItemImage(
  buffer: Buffer,
  originalFilename: string,
  userId: string,
  itemId: string,
): Promise<ProcessedUpload> {
  const originalSize = buffer.length;

  // Magic byte validation
  if (!validateImageMagicBytes(buffer)) {
    throw new HTTPException(422, {
      message: 'File does not appear to be a valid image (magic byte check failed)',
    });
  }

  // Size validation
  const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new HTTPException(413, {
      message: `File size ${(buffer.length / 1024 / 1024).toFixed(1)}MB exceeds limit of ${env.MAX_FILE_SIZE_MB}MB`,
    });
  }

  const mimeType = detectMimeType(buffer);
  const itemKey = generateItemKey(userId, itemId, originalFilename);
  const thumbnailKey = `thumbs/${userId}/${itemId}.webp`;

  // Process main image (resize to max 2048px, compress)
  const processedBuffer = await sharp(buffer)
    .rotate() // auto-rotate based on EXIF
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();

  // Generate thumbnail (400px wide webp)
  const thumbnailBuffer = await sharp(buffer)
    .rotate()
    .resize(400, 400, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toBuffer();

  // Upload to quarantine
  await uploadToQuarantine(processedBuffer, itemKey, 'image/jpeg');
  await uploadToQuarantine(thumbnailBuffer, thumbnailKey, 'image/webp');

  // Virus scan simulation
  // In production: await scanWithClamAV(processedBuffer);
  await simulateVirusScan(processedBuffer);

  // Move to main bucket after scan passes
  const [mainResult, thumbnailResult] = await Promise.all([
    moveToMainBucket(itemKey),
    moveToMainBucket(thumbnailKey),
  ]);

  logger.info(
    { itemId, userId, originalSize, processedSize: processedBuffer.length },
    'Image processed and uploaded',
  );

  return {
    key: mainResult.key,
    cdnUrl: mainResult.cdnUrl,
    thumbnailKey: thumbnailResult.key,
    thumbnailCdnUrl: thumbnailResult.cdnUrl,
    base64: await bufferToBase64(processedBuffer),
    mimeType: 'image/jpeg',
    originalSize,
    processedSize: processedBuffer.length,
  };
}

/**
 * Process and upload a UCard image.
 */
export async function processAndUploadUCardImage(
  buffer: Buffer,
  recoveryId: string,
): Promise<{ key: string; cdnUrl: string; base64: string; mimeType: string }> {
  if (!validateImageMagicBytes(buffer)) {
    throw new HTTPException(422, { message: 'Invalid image file' });
  }

  const mimeType = detectMimeType(buffer);
  const key = generateUCardKey(recoveryId);

  // Enhance card readability
  const processedBuffer = await sharp(buffer)
    .rotate()
    .resize(1200, null, { withoutEnlargement: true })
    .sharpen()
    .jpeg({ quality: 95 })
    .toBuffer();

  await uploadToQuarantine(processedBuffer, key, 'image/jpeg');
  await simulateVirusScan(processedBuffer);
  const result = await moveToMainBucket(key);

  return {
    key: result.key,
    cdnUrl: result.cdnUrl,
    base64: await bufferToBase64(processedBuffer),
    mimeType: 'image/jpeg',
  };
}

/**
 * Simulate virus scanning.
 * In production, replace with:
 * - ClamAV via clamscan package
 * - VirusTotal API
 * - AWS GuardDuty Malware Protection for S3
 */
async function simulateVirusScan(buffer: Buffer): Promise<void> {
  // Check for EICAR test signature (standard AV test string)
  const eicarSignature = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR');
  if (buffer.includes(eicarSignature)) {
    throw new HTTPException(422, { message: 'File failed security scan' });
  }

  // In production, integrate real AV scanning here
  logger.debug({ size: buffer.length }, 'Virus scan: clean');
}

/**
 * Extract file buffer from a Hono multipart form field.
 */
export async function extractFileBuffer(formData: FormData, fieldName: string): Promise<Buffer | null> {
  const file = formData.get(fieldName);
  if (!file || !(file instanceof File)) return null;

  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function extractFileWithMeta(
  formData: FormData,
  fieldName: string,
): Promise<{ buffer: Buffer; name: string; type: string } | null> {
  const file = formData.get(fieldName);
  if (!file || !(file instanceof File)) return null;

  const arrayBuffer = await file.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    name: file.name,
    type: file.type,
  };
}
