import { eq, and, gte } from 'drizzle-orm';
import { getDb, schema } from '../lib/db.js';
import { HTTPException } from 'hono/http-exception';
import { hashAnswer } from '../utils/helpers.js';
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

  if (!claim.itemId) {
    throw new HTTPException(400, { message: 'Claim has no associated item (already migrated)' });
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

  // If approved: migrate item to claimed_items, then delete from items
  if (params.action === 'approve' && claim.itemId) {
    await migrateItemToClaimedAndDelete(db, claim.id, claim.itemId);
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

  // Check if item still exists (owner = item.userId)
  const [item] = await db
    .select({ userId: schema.items.userId })
    .from(schema.items)
    .where(eq(schema.items.id, itemId))
    .limit(1);

  // If item exists, verify ownership
  if (item) {
    if (item.userId !== requestingUserId) {
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

  // Item was deleted (migrated to claimed_items); verify via claim ownership
  const claimsByOriginal = await db
    .select({
      id: schema.claims.id,
      ownerId: schema.claims.ownerId,
    })
    .from(schema.claims)
    .innerJoin(schema.claimedItems, eq(schema.claims.id, schema.claimedItems.claimId))
    .where(eq(schema.claimedItems.originalItemId, itemId))
    .limit(1);

  if (claimsByOriginal.length === 0) {
    throw new HTTPException(404, { message: 'No claims found for this item' });
  }
  if (claimsByOriginal[0].ownerId !== requestingUserId) {
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
    .innerJoin(schema.claimedItems, eq(schema.claims.id, schema.claimedItems.claimId))
    .leftJoin(schema.users, eq(schema.claims.claimantId, schema.users.id))
    .where(eq(schema.claimedItems.originalItemId, itemId))
    .orderBy(schema.claims.createdAt);
}

async function migrateItemToClaimedAndDelete(
  db: ReturnType<typeof getDb>,
  claimId: string,
  itemId: string,
): Promise<void> {
  const [item] = await db
    .select()
    .from(schema.items)
    .where(eq(schema.items.id, itemId))
    .limit(1);

  if (!item) return;

  await db.insert(schema.claimedItems).values({
    claimId,
    originalItemId: itemId,
    title: item.title,
    description: item.description,
    category: item.category,
    spireId: item.spireId,
    location: item.location,
    dateOccurred: item.dateOccurred,
    imageUrl: item.imageUrl,
    imageKey: item.imageKey,
    thumbnailUrl: item.thumbnailUrl,
    foundMode: item.foundMode,
    contactEmail: item.contactEmail,
    isAnonymous: item.isAnonymous,
    aiMetadata: item.aiMetadata,
  });

  await db.delete(schema.items).where(eq(schema.items.id, itemId));
  logger.info({ claimId, itemId }, 'Item migrated to claimed_items and deleted from items');
}

const CLAIMS_PER_DAY_LIMIT = 5;
const CLAIM_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ClaimPreviewResult {
  bestMatch: null;
  hasLostReport: boolean;
  warning: null;
}

export async function getClaimPreview(itemId: string, claimantId: string): Promise<ClaimPreviewResult> {
  const db = getDb();
  const [item] = await db
    .select({
      id: schema.items.id,
      type: schema.items.type,
      status: schema.items.status,
      userId: schema.items.userId,
    })
    .from(schema.items)
    .where(eq(schema.items.id, itemId))
    .limit(1);

  if (!item) throw new HTTPException(404, { message: 'Item not found' });
  if (item.type !== 'found') throw new HTTPException(422, { message: 'Claims can only be made on found items' });
  if (item.status !== 'active') throw new HTTPException(422, { message: 'This item is no longer active' });
  if (item.userId === claimantId) throw new HTTPException(422, { message: 'You cannot claim your own item' });

  return { bestMatch: null, hasLostReport: false, warning: null };
}

export interface SubmitClaimResult {
  claim: {
    id: string;
    itemId: string;
    claimantId: string;
    ownerId: string;
    similarityScore: number | null;
    status: string;
    createdAt: Date;
  };
  matchInfo: ClaimPreviewResult['bestMatch'];
}

export async function submitClaimForItem(itemId: string, claimantId: string): Promise<SubmitClaimResult> {
  const db = getDb();
  const since = new Date(Date.now() - CLAIM_DAILY_WINDOW_MS);
  const recentClaims = await db
    .select({ id: schema.claims.id })
    .from(schema.claims)
    .where(and(eq(schema.claims.claimantId, claimantId), gte(schema.claims.createdAt, since)));

  if (recentClaims.length >= CLAIMS_PER_DAY_LIMIT) {
    throw new HTTPException(429, {
      message: `You can submit at most ${CLAIMS_PER_DAY_LIMIT} claims per day. Try again tomorrow.`,
    });
  }

  const [item] = await db
    .select({
      id: schema.items.id,
      type: schema.items.type,
      status: schema.items.status,
      userId: schema.items.userId,
      title: schema.items.title,
    })
    .from(schema.items)
    .where(eq(schema.items.id, itemId))
    .limit(1);

  if (!item) throw new HTTPException(404, { message: 'Item not found' });
  if (item.type !== 'found') throw new HTTPException(422, { message: 'Claims can only be made on found items' });
  if (item.status !== 'active') throw new HTTPException(422, { message: 'This item is no longer active' });
  if (item.userId === claimantId) throw new HTTPException(422, { message: 'You cannot claim your own item' });

  const [existingClaim] = await db
    .select()
    .from(schema.claims)
    .where(and(eq(schema.claims.itemId, itemId), eq(schema.claims.claimantId, claimantId)))
    .limit(1);
  if (existingClaim) {
    throw new HTTPException(409, { message: 'You have already submitted a claim for this item' });
  }

  await getClaimPreview(itemId, claimantId);

  const [claim] = await db
    .insert(schema.claims)
    .values({
      itemId,
      claimantId,
      ownerId: item.userId,
      similarityScore: null,
      status: 'approved',
      deletedAt: new Date(),
    })
    .returning();

  await migrateItemToClaimedAndDelete(db, claim.id, itemId);

  const [claimant] = await db
    .select({ displayName: schema.users.displayName })
    .from(schema.users)
    .where(eq(schema.users.id, claimantId))
    .limit(1);

  await db.insert(schema.notifications).values({
    userId: item.userId,
    type: 'claim_approved',
    title: 'Item Claimed',
    body: `The item '${item.title}' was claimed!`,
    data: { claimId: claim.id, itemId },
  });

  logger.info({ claimId: claim.id, itemId }, 'Instant claim submitted and approved');

  return {
    claim: {
      id: claim.id,
      itemId,
      claimantId: claim.claimantId,
      ownerId: claim.ownerId!,
      similarityScore: claim.similarityScore,
      status: claim.status,
      createdAt: claim.createdAt,
    },
    matchInfo: null,
  };
}
