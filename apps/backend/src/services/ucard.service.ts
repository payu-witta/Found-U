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

  // Try to find matching user: first by SPIRE ID (reported lost), then by last name fallback
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
 * Try to match the UCard to a registered user:
 * 1. First: SPIRE ID match against ucard_lost_reports (exact, secure via Argon2 verify)
 * 2. Fallback: Last name match in email (legacy heuristic for users who haven't reported lost)
 */
async function tryMatchAndNotifyUser(params: {
  recoveryId: string;
  spireId: string;
  lastName: string | null;
  finderNote?: string;
}): Promise<boolean> {
  const db = getDb();

  // 1. SPIRE ID match: check ucard_lost_reports (users who reported their lost UCard)
  const lostReports = await db
    .select({
      id: schema.ucardLostReports.id,
      userId: schema.ucardLostReports.userId,
      spireIdHash: schema.ucardLostReports.spireIdHash,
    })
    .from(schema.ucardLostReports)
    .where(eq(schema.ucardLostReports.status, 'active'));

  for (const report of lostReports) {
    const isMatch = await verifySensitiveData(params.spireId, report.spireIdHash);
    if (isMatch) {
      const [user] = await db
        .select({ id: schema.users.id, email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, report.userId))
        .limit(1);

      if (user) {
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

          await db
            .update(schema.ucardRecoveries)
            .set({ notifiedAt: new Date(), status: 'notified' })
            .where(eq(schema.ucardRecoveries.id, params.recoveryId));

          await db
            .update(schema.ucardLostReports)
            .set({
              status: 'resolved',
              resolvedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.ucardLostReports.id, report.id));

          logger.info({ recoveryId: params.recoveryId, userId: user.id }, 'UCard matched via SPIRE ID, owner notified');
          return true;
        } catch (err) {
          logger.warn({ err, userId: user.id }, 'Failed to notify UCard owner');
        }
      }
    }
  }

  // 2. Fallback: last name match in email (legacy)
  if (!params.lastName) return false;

  const lastNameLower = params.lastName.toLowerCase();
  const potentialUsers = await db
    .select({ id: schema.users.id, email: schema.users.email, displayName: schema.users.displayName })
    .from(schema.users)
    .limit(20);

  const matchingUsers = potentialUsers.filter((user) => {
    const emailPrefix = user.email.split('@')[0].toLowerCase();
    return emailPrefix.includes(lastNameLower);
  });

  if (matchingUsers.length === 0) return false;

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

/**
 * Report a lost UCard. User provides SPIRE ID (8 digits); stored as Argon2 hash only.
 * One active report per user at a time.
 */
export async function reportLostUCard(params: {
  userId: string;
  spireId: string;
}): Promise<{ id: string; status: string }> {
  const db = getDb();

  const spireIdHash = await hashSensitiveData(params.spireId);

  // Resolve any existing active report for this user
  await db
    .update(schema.ucardLostReports)
    .set({ status: 'resolved', resolvedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.ucardLostReports.userId, params.userId),
        eq(schema.ucardLostReports.status, 'active'),
      ),
    );

  const [report] = await db
    .insert(schema.ucardLostReports)
    .values({
      userId: params.userId,
      spireIdHash,
      status: 'active',
    })
    .returning({ id: schema.ucardLostReports.id, status: schema.ucardLostReports.status });

  logger.info({ reportId: report.id, userId: params.userId }, 'Lost UCard reported');
  return { id: report.id, status: report.status };
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
