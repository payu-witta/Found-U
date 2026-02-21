import { eq, and, sql, desc } from 'drizzle-orm';
import { getDb, schema } from '../lib/db.js';
import { MATCH_THRESHOLD, MAX_MATCHES } from '@foundu/ai';
import {
  sendEmail,
  matchFoundEmailHtml,
} from '../lib/email.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

export interface MatchResult {
  id: string;
  similarityScore: number;
  status: string;
  lostItem: {
    id: string;
    title: string;
    imageUrl: string | null;
    location: string | null;
    category: string | null;
    createdAt: Date;
    user: { id: string; displayName: string | null; email: string };
  };
  foundItem: {
    id: string;
    title: string;
    imageUrl: string | null;
    location: string | null;
    category: string | null;
    createdAt: Date;
    user: { id: string; displayName: string | null; email: string };
  };
}

/**
 * Run the matching pipeline for a newly posted item.
 * Compares against opposite-type active items with embeddings.
 * Uses PostgreSQL pgvector cosine similarity via the search_items_by_embedding function.
 */
export async function runMatchingForItem(
  itemId: string,
  itemType: 'lost' | 'found',
): Promise<void> {
  const db = getDb();

  // Get the item and its embedding
  const [item] = await db
    .select()
    .from(schema.items)
    .where(eq(schema.items.id, itemId))
    .limit(1);

  if (!item || !item.embedding) {
    logger.warn({ itemId }, 'Cannot run matching: item not found or missing embedding');
    return;
  }

  const oppositeType = itemType === 'lost' ? 'found' : 'lost';

  // Use pgvector cosine similarity search via raw SQL
  const embeddingStr = `[${item.embedding.join(',')}]`;
  const rawResults = await db.execute(
    sql`
      SELECT
        i.id,
        i.user_id,
        i.type,
        i.title,
        i.description,
        i.category,
        i.location,
        i.image_url,
        i.thumbnail_url,
        i.created_at,
        (1 - (i.embedding <=> ${embeddingStr}::vector))::float AS similarity
      FROM items i
      WHERE
        i.status = 'active'
        AND i.embedding IS NOT NULL
        AND i.type = ${oppositeType}
        AND i.id != ${itemId}
        AND (1 - (i.embedding <=> ${embeddingStr}::vector)) >= ${MATCH_THRESHOLD}
      ORDER BY i.embedding <=> ${embeddingStr}::vector
      LIMIT ${MAX_MATCHES}
    `,
  );

  const candidates = (rawResults as unknown) as Array<{
    id: string;
    user_id: string;
    type: string;
    title: string;
    category: string | null;
    location: string | null;
    image_url: string | null;
    created_at: Date;
    similarity: number;
  }>;

  if (candidates.length === 0) {
    logger.debug({ itemId, itemType }, 'No matches found above threshold');
    return;
  }

  logger.info({ itemId, itemType, matchCount: candidates.length }, 'Matches found, persisting');

  // Persist matches and notify
  for (const candidate of candidates) {
    const lostItemId = itemType === 'lost' ? itemId : candidate.id;
    const foundItemId = itemType === 'found' ? itemId : candidate.id;

    try {
      // Upsert match record
      await db
        .insert(schema.matches)
        .values({
          lostItemId,
          foundItemId,
          similarityScore: candidate.similarity,
          status: 'pending',
        })
        .onConflictDoUpdate({
          target: [schema.matches.lostItemId, schema.matches.foundItemId],
          set: {
            similarityScore: candidate.similarity,
            updatedAt: new Date(),
          },
        });

      // Notify the owner of the lost item
      await notifyMatchFound(lostItemId, foundItemId, candidate.similarity);
    } catch (err) {
      logger.error({ err, lostItemId, foundItemId }, 'Failed to persist or notify match');
    }
  }
}

/**
 * Send email notification to lost item owner when a match is found.
 */
async function notifyMatchFound(
  lostItemId: string,
  foundItemId: string,
  similarity: number,
): Promise<void> {
  const db = getDb();

  const [lostItem] = await db
    .select({
      id: schema.items.id,
      title: schema.items.title,
      userId: schema.items.userId,
      notifiedEmail: schema.users.email,
      notifiedName: schema.users.displayName,
    })
    .from(schema.items)
    .leftJoin(schema.users, eq(schema.items.userId, schema.users.id))
    .where(eq(schema.items.id, lostItemId))
    .limit(1);

  const [foundItem] = await db
    .select({ id: schema.items.id, title: schema.items.title, location: schema.items.location })
    .from(schema.items)
    .where(eq(schema.items.id, foundItemId))
    .limit(1);

  if (!lostItem || !foundItem || !lostItem.notifiedEmail) return;

  const itemUrl = `${env.FRONTEND_URL}/items/${foundItemId}`;

  try {
    await sendEmail({
      to: lostItem.notifiedEmail,
      subject: `FoundU: We may have found your "${lostItem.title}"`,
      html: matchFoundEmailHtml({
        ownerName: lostItem.notifiedName ?? 'there',
        lostItemTitle: lostItem.title,
        foundItemTitle: foundItem.title,
        matchScore: similarity,
        foundItemLocation: foundItem.location,
        itemUrl,
      }),
    });

    // Mark as notified
    await db
      .update(schema.matches)
      .set({ notifiedAt: new Date() })
      .where(
        and(
          eq(schema.matches.lostItemId, lostItemId),
          eq(schema.matches.foundItemId, foundItemId),
        ),
      );

    // Create in-app notification
    await db.insert(schema.notifications).values({
      userId: lostItem.userId,
      type: 'match_found',
      title: 'Potential Match Found!',
      body: `We found a potential match for your lost "${lostItem.title}".`,
      data: { lostItemId, foundItemId, similarity },
    });
  } catch (err) {
    logger.error({ err, lostItemId, foundItemId }, 'Failed to send match notification email');
  }
}

/**
 * Get top matches for an item (for the /matches/:itemId endpoint).
 */
export async function getMatchesForItem(itemId: string): Promise<MatchResult[]> {
  const db = getDb();

  const [item] = await db
    .select()
    .from(schema.items)
    .where(eq(schema.items.id, itemId))
    .limit(1);

  if (!item) return [];

  const isLost = item.type === 'lost';

  // Query matches where this item is either the lost or found side
  const matchRows = await db
    .select({
      id: schema.matches.id,
      similarityScore: schema.matches.similarityScore,
      status: schema.matches.status,
      lostItemId: schema.matches.lostItemId,
      foundItemId: schema.matches.foundItemId,
      createdAt: schema.matches.createdAt,
    })
    .from(schema.matches)
    .where(
      isLost
        ? eq(schema.matches.lostItemId, itemId)
        : eq(schema.matches.foundItemId, itemId),
    )
    .orderBy(desc(schema.matches.similarityScore))
    .limit(MAX_MATCHES);

  // Hydrate with item details
  const results: MatchResult[] = [];

  for (const match of matchRows) {
    const [lostData, foundData] = await Promise.all([
      db
        .select({
          id: schema.items.id,
          title: schema.items.title,
          imageUrl: schema.items.imageUrl,
          location: schema.items.location,
          category: schema.items.category,
          createdAt: schema.items.createdAt,
          userId: schema.items.userId,
          userDisplayName: schema.users.displayName,
          userEmail: schema.users.email,
        })
        .from(schema.items)
        .leftJoin(schema.users, eq(schema.items.userId, schema.users.id))
        .where(eq(schema.items.id, match.lostItemId))
        .limit(1),
      db
        .select({
          id: schema.items.id,
          title: schema.items.title,
          imageUrl: schema.items.imageUrl,
          location: schema.items.location,
          category: schema.items.category,
          createdAt: schema.items.createdAt,
          userId: schema.items.userId,
          userDisplayName: schema.users.displayName,
          userEmail: schema.users.email,
        })
        .from(schema.items)
        .leftJoin(schema.users, eq(schema.items.userId, schema.users.id))
        .where(eq(schema.items.id, match.foundItemId))
        .limit(1),
    ]);

    if (!lostData[0] || !foundData[0]) continue;

    results.push({
      id: match.id,
      similarityScore: match.similarityScore,
      status: match.status,
      lostItem: {
        id: lostData[0].id,
        title: lostData[0].title,
        imageUrl: lostData[0].imageUrl,
        location: lostData[0].location,
        category: lostData[0].category,
        createdAt: lostData[0].createdAt,
        user: {
          id: lostData[0].userId,
          displayName: lostData[0].userDisplayName,
          email: lostData[0].userEmail ?? '',
        },
      },
      foundItem: {
        id: foundData[0].id,
        title: foundData[0].title,
        imageUrl: foundData[0].imageUrl,
        location: foundData[0].location,
        category: foundData[0].category,
        createdAt: foundData[0].createdAt,
        user: {
          id: foundData[0].userId,
          displayName: foundData[0].userDisplayName,
          email: foundData[0].userEmail ?? '',
        },
      },
    });
  }

  return results;
}
