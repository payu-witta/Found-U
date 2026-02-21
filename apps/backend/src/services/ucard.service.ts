import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '../lib/db.js';
import { extractUCardData, isValidSpireId } from '@foundu/ai';
import { processAndUploadUCardImage } from './storage.service.js';
import { hashSensitiveData, verifySensitiveData } from '../utils/helpers.js';
import { sendEmail, ucardFoundEmailHtml } from '../lib/email.js';
import { HTTPException } from 'hono/http-exception';
import { logger } from '../lib/logger.js';
import { randomUUID } from 'crypto';

/**
 * Process a UCard submission:
 * 1. Upload image
 * 2. AI extracts SPIRE ID + name
 * 3. Hash SPIRE ID with Argon2id + pepper
 * 4. Check for matching user
 * 5. If match, send notification email
 */
export async function processUCardSubmission(params: {
  finderId: string;
  imageBuffer: Buffer;
  finderNote?: string;
}): Promise<{
  recoveryId: string;
  extracted: boolean;
  matched: boolean;
  message: string;
}> {
  const db = getDb();
  const recoveryId = randomUUID();

  // Upload image
  const upload = await processAndUploadUCardImage(params.imageBuffer, recoveryId);

  // AI extraction
  const extracted = await extractUCardData(upload.base64, upload.mimeType);

  if (!extracted.isUMassCard) {
    throw new HTTPException(422, {
      message: 'The uploaded image does not appear to be a UMass UCard',
    });
  }

  if (!extracted.spireId || !isValidSpireId(extracted.spireId)) {
    // Store record even without SPIRE ID for manual review
    await db.insert(schema.ucardRecoveries).values({
      id: recoveryId,
      finderId: params.finderId,
      spireIdHash: 'unreadable',
      lastNameLower: extracted.lastName?.toLowerCase() ?? null,
      imageKey: upload.key,
      imageUrl: upload.cdnUrl,
      status: 'unreadable',
    });

    logger.warn({ recoveryId }, 'UCard SPIRE ID could not be extracted');

    return {
      recoveryId,
      extracted: false,
      matched: false,
      message: 'Card submitted but SPIRE ID could not be read. A staff member will review it.',
    };
  }

  // Hash SPIRE ID — never store raw
  const spireIdHash = await hashSensitiveData(extracted.spireId);

  await db.insert(schema.ucardRecoveries).values({
    id: recoveryId,
    finderId: params.finderId,
    spireIdHash,
    lastNameLower: extracted.lastName?.toLowerCase() ?? null,
    imageKey: upload.key,
    imageUrl: upload.cdnUrl,
    status: 'pending',
  });

  logger.info({ recoveryId, confidence: extracted.confidence }, 'UCard recovery created');

  // Try to find matching user by email pattern
  // UMass email format: firstname_lastname@umass.edu or spireId@umass.edu
  const matched = await tryMatchAndNotifyUser({
    recoveryId,
    spireId: extracted.spireId,
    lastName: extracted.lastName,
    finderNote: params.finderNote,
  });

  return {
    recoveryId,
    extracted: true,
    matched,
    message: matched
      ? 'Card submitted and owner has been notified via email.'
      : 'Card submitted. If we find the owner in our system, they will be notified.',
  };
}

/**
 * Try to match the UCard to a registered user by comparing last name
 * and send notification if found.
 */
async function tryMatchAndNotifyUser(params: {
  recoveryId: string;
  spireId: string;
  lastName: string | null;
  finderNote?: string;
}): Promise<boolean> {
  const db = getDb();

  if (!params.lastName) return false;

  // Find users with matching last name in email
  // UMass email pattern: firstname.lastname@umass.edu or similar
  const lastNameLower = params.lastName.toLowerCase();

  const potentialUsers = await db
    .select({ id: schema.users.id, email: schema.users.email, displayName: schema.users.displayName })
    .from(schema.users)
    .limit(20);

  // Filter by last name match in email (approximate)
  const matchingUsers = potentialUsers.filter((user) => {
    const emailPrefix = user.email.split('@')[0].toLowerCase();
    return emailPrefix.includes(lastNameLower);
  });

  if (matchingUsers.length === 0) return false;

  // Send notifications and create in-app notifications
  for (const user of matchingUsers) {
    try {
      await sendEmail({
        to: user.email,
        subject: 'FoundU: Your UCard has been found!',
        html: ucardFoundEmailHtml({ recipientEmail: user.email, finderNote: params.finderNote }),
      });

      await db.insert(schema.notifications).values({
        userId: user.id,
        type: 'ucard_found',
        title: 'Your UCard Was Found!',
        body: 'Someone has submitted your UMass UCard on FoundU. Log in to claim it.',
        data: { recoveryId: params.recoveryId },
      });

      // Update recovery as notified
      await db
        .update(schema.ucardRecoveries)
        .set({ notifiedAt: new Date(), status: 'notified' })
        .where(eq(schema.ucardRecoveries.id, params.recoveryId));
    } catch (err) {
      logger.warn({ err, userId: user.id }, 'Failed to notify UCard owner');
    }
  }

  return matchingUsers.length > 0;
}

export async function getUCardRecovery(recoveryId: string) {
  const db = getDb();
  const [recovery] = await db
    .select({
      id: schema.ucardRecoveries.id,
      imageUrl: schema.ucardRecoveries.imageUrl,
      status: schema.ucardRecoveries.status,
      lastNameLower: schema.ucardRecoveries.lastNameLower,
      createdAt: schema.ucardRecoveries.createdAt,
      notifiedAt: schema.ucardRecoveries.notifiedAt,
    })
    .from(schema.ucardRecoveries)
    .where(eq(schema.ucardRecoveries.id, recoveryId))
    .limit(1);
  return recovery ?? null;
}
