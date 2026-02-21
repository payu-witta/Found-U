import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let _s3Client: S3Client | null = null;

export const getS3Client = (): S3Client => {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return _s3Client;
};

export interface UploadResult {
  key: string;
  url: string;
  cdnUrl: string;
}

/**
 * Upload a buffer to S3 quarantine bucket for virus scanning.
 * After scanning passes, call moveToMainBucket().
 */
export async function uploadToQuarantine(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<UploadResult> {
  const s3 = getS3Client();

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_QUARANTINE,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        'upload-timestamp': new Date().toISOString(),
        'scan-status': 'pending',
      },
    }),
  );

  logger.info({ key, bucket: env.S3_BUCKET_QUARANTINE }, 'File uploaded to quarantine');

  return {
    key,
    url: `https://${env.S3_BUCKET_QUARANTINE}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
    cdnUrl: `${env.CLOUDFRONT_DOMAIN}/${key}`,
  };
}

/**
 * Move a file from quarantine to the main bucket after scan passes.
 */
export async function moveToMainBucket(key: string): Promise<UploadResult> {
  const s3 = getS3Client();

  // Copy from quarantine to main
  await s3.send(
    new CopyObjectCommand({
      CopySource: `${env.S3_BUCKET_QUARANTINE}/${key}`,
      Bucket: env.S3_BUCKET_MAIN,
      Key: key,
      MetadataDirective: 'REPLACE',
      Metadata: {
        'scan-status': 'clean',
        'moved-at': new Date().toISOString(),
      },
    }),
  );

  // Delete from quarantine
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET_QUARANTINE,
      Key: key,
    }),
  );

  logger.info({ key }, 'File moved from quarantine to main bucket');

  return {
    key,
    url: `https://${env.S3_BUCKET_MAIN}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
    cdnUrl: `${env.CLOUDFRONT_DOMAIN}/${key}`,
  };
}

/**
 * Upload directly to the main bucket (for non-user-uploaded files).
 */
export async function uploadToMain(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<UploadResult> {
  const s3 = getS3Client();

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_MAIN,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return {
    key,
    url: `https://${env.S3_BUCKET_MAIN}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
    cdnUrl: `${env.CLOUDFRONT_DOMAIN}/${key}`,
  };
}

export async function deleteFromMain(key: string): Promise<void> {
  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET_MAIN,
      Key: key,
    }),
  );
  logger.info({ key }, 'File deleted from main bucket');
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const s3 = getS3Client();
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.S3_BUCKET_MAIN, Key: key }),
    { expiresIn },
  );
}

export function generateItemKey(userId: string, itemId: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  return `items/${userId}/${itemId}.${ext}`;
}

export function generateUCardKey(recoveryId: string): string {
  return `ucards/${recoveryId}.jpg`;
}

export function getCdnUrl(key: string): string {
  return `${env.CLOUDFRONT_DOMAIN}/${key}`;
}
