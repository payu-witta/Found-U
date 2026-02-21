import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '../lib/db.js';
import { HTTPException } from 'hono/http-exception';
import { hashAnswer, verifyAnswer } from '../utils/helpers.js';
import { sendEmail, claimVerificationEmailHtml } from '../lib/email.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

/**
 * Submit a claim for a found item.
 * The claimant provides a verification answer.
 */
export async function createClaim(params: {
  itemId: string;
  claimantId: string;
  verificationAnswer: string;
  notes?: string | null;
}) {
  const db = getDb();

  // Get the item
  const [item] = await db
    .select({
      id: schema.items.id,
      type: schema.items.type,
      title: schema.items.title,
      status: schema.items.status,
      userId: schema.items.userId,
      aiMetadata: schema.items.aiMetadata,
    })
    .from(schema.items)
    .where(eq(schema.items.id, params.itemId))
    .limit(1);

  if (!item) {
    throw new HTTPException(404, { message: 'Item not found' });
  }

  if (item.type !== 'found') {
    throw new HTTPException(422, { message: 'Claims can only be made on found items' });
  }

  if (item.status !== 'active') {
    throw new HTTPException(422, { message: 'This item is no longer active' });
  }

  if (item.userId === params.claimantId) {
    throw new HTTPException(422, { message: 'You cannot claim your own item' });
  }

  // Check for duplicate claim
  const [existingClaim] = await db
    .select()
    .from(schema.claims)
    .where(
      and(
        eq(schema.claims.itemId, params.itemId),
        eq(schema.claims.claimantId, params.claimantId),
      ),
    )
    .limit(1);

  if (existingClaim) {
    throw new HTTPException(409, { message: 'You have already submitted a claim for this item' });
  }

  const verificationQuestion = item.aiMetadata?.verificationQuestion ?? null;
  const answerHash = await hashAnswer(params.verificationAnswer);

  const [claim] = await db
    .insert(schema.claims)
    .values({
      itemId: params.itemId,
      claimantId: params.claimantId,
      verificationQuestion,
      verificationAnswerHash: answerHash,
      notes: params.notes ?? null,
      status: 'pending',
    })
    .returning();

  // Notify item owner
  const [claimant] = await db
    .select({ displayName: schema.users.displayName, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, params.claimantId))
    .limit(1);

  const [itemOwner] = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, item.userId))
    .limit(1);

  if (itemOwner?.email) {
    try {
      await sendEmail({
        to: itemOwner.email,
        subject: `FoundU: New claim on "${item.title}"`,
        html: claimVerificationEmailHtml({
          claimantName: claimant?.displayName ?? 'Someone',
          itemTitle: item.title,
          verificationQuestion: verificationQuestion ?? 'No verification question set',
          claimUrl: `${env.FRONTEND_URL}/claims/${claim.id}`,
        }),
      });
    } catch (err) {
      logger.warn({ err, claimId: claim.id }, 'Failed to send claim notification email');
    }
  }

  // In-app notification for item owner
  await db.insert(schema.notifications).values({
    userId: item.userId,
    type: 'claim_submitted',
    title: 'New Claim Submitted',
    body: `${claimant?.displayName ?? 'Someone'} has submitted a claim for "${item.title}".`,
    data: { claimId: claim.id, itemId: params.itemId },
  });

  logger.info({ claimId: claim.id, itemId: params.itemId }, 'Claim created');
  return claim;
}

/**
 * Verify a claim answer against the stored hash (from item owner's perspective).
 * Also allows item owner to approve/reject.
 */
export async function verifyClaim(params: {
  claimId: string;
  itemOwnerId: string;
  action: 'approve' | 'reject';
}) {
  const db = getDb();

  const [claim] = await db
    .select()
    .from(schema.claims)
    .where(eq(schema.claims.id, params.claimId))
    .limit(1);

  if (!claim) {
    throw new HTTPException(404, { message: 'Claim not found' });
  }

  // Verify item ownership
  const [item] = await db
    .select({ userId: schema.items.userId, title: schema.items.title })
    .from(schema.items)
    .where(eq(schema.items.id, claim.itemId))
    .limit(1);

  if (!item || item.userId !== params.itemOwnerId) {
    throw new HTTPException(403, { message: 'Not authorized to verify this claim' });
  }

  const newStatus = params.action === 'approve' ? 'approved' : 'rejected';

  const [updated] = await db
    .update(schema.claims)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(schema.claims.id, params.claimId))
    .returning();

  // If approved, mark item as resolved
  if (params.action === 'approve') {
    await db
      .update(schema.items)
      .set({ status: 'resolved', updatedAt: new Date() })
      .where(eq(schema.items.id, claim.itemId));
  }

  // Notify claimant
  await db.insert(schema.notifications).values({
    userId: claim.claimantId,
    type: params.action === 'approve' ? 'claim_approved' : 'claim_submitted',
    title: params.action === 'approve' ? 'Claim Approved!' : 'Claim Rejected',
    body:
      params.action === 'approve'
        ? `Your claim for "${item.title}" has been approved. Contact the finder to arrange pickup.`
        : `Your claim for "${item.title}" was not approved.`,
    data: { claimId: params.claimId, itemId: claim.itemId },
  });

  logger.info({ claimId: params.claimId, action: params.action }, 'Claim verified');
  return updated;
}

export async function getClaimsForItem(itemId: string, requestingUserId: string) {
  const db = getDb();

  // Only item owner can view claims
  const [item] = await db
    .select({ userId: schema.items.userId })
    .from(schema.items)
    .where(eq(schema.items.id, itemId))
    .limit(1);

  if (!item || item.userId !== requestingUserId) {
    throw new HTTPException(403, { message: 'Not authorized to view these claims' });
  }

  return db
    .select({
      id: schema.claims.id,
      status: schema.claims.status,
      verificationQuestion: schema.claims.verificationQuestion,
      notes: schema.claims.notes,
      createdAt: schema.claims.createdAt,
      claimantId: schema.claims.claimantId,
      claimantName: schema.users.displayName,
      claimantEmail: schema.users.email,
    })
    .from(schema.claims)
    .leftJoin(schema.users, eq(schema.claims.claimantId, schema.users.id))
    .where(eq(schema.claims.itemId, itemId))
    .orderBy(schema.claims.createdAt);
}
