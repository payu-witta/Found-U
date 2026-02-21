import { eq, and, desc, sql, ilike, lt } from 'drizzle-orm';
import { getDb, schema } from '../lib/db.js';
import { HTTPException } from 'hono/http-exception';
import { processAndUploadItemImage, extractFileWithMeta } from './storage.service.js';
import { analyzeItemPipeline } from './ai.service.js';
import { runMatchingForItem } from './matching.service.js';
import { logger } from '../lib/logger.js';
import { serializeItem } from '../utils/helpers.js';
import { randomUUID } from 'crypto';

// ── Post Lost Item ────────────────────────────────────────────────────────────
export async function createLostItem(params: {
  userId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  location?: string | null;
  dateLost?: string | null;
  formData: FormData;
}) {
  const db = getDb();
  const itemId = randomUUID();

  let imageKey: string | null = null;
  let imageUrl: string | null = null;
  let thumbnailUrl: string | null = null;
  let aiMetadata: schema.NewItem['aiMetadata'] = null;
  let embedding: number[] | null = null;

  // Handle image upload if present
  const fileData = await extractFileWithMeta(params.formData, 'image');
  if (fileData) {
    const upload = await processAndUploadItemImage(
      fileData.buffer,
      fileData.name,
      params.userId,
      itemId,
    );

    imageKey = upload.key;
    imageUrl = upload.cdnUrl;
    thumbnailUrl = upload.thumbnailCdnUrl ?? null;

    // AI pipeline
    const aiResult = await analyzeItemPipeline({
      imageBase64: upload.base64,
      mimeType: upload.mimeType,
      title: params.title,
      description: params.description,
      location: params.location,
    });

    aiMetadata = {
      detectedObjects: aiResult.visionResult.detectedObjects,
      colors: aiResult.visionResult.colors,
      brand: aiResult.visionResult.brand,
      condition: aiResult.visionResult.condition,
      distinctiveFeatures: aiResult.visionResult.distinctiveFeatures,
      verificationQuestion: null,
      verificationAnswerHash: null,
      confidence: aiResult.visionResult.confidence,
    };
    embedding = aiResult.embedding;
  }

  const [item] = await db
    .insert(schema.items)
    .values({
      id: itemId,
      userId: params.userId,
      type: 'lost',
      title: params.title,
      description: params.description ?? null,
      category: params.category ?? aiMetadata?.detectedObjects?.[0] ?? null,
      location: params.location ?? null,
      dateOccurred: params.dateLost ?? null,
      imageKey,
      imageUrl,
      thumbnailUrl,
      aiMetadata,
      embedding,
      status: 'active',
    })
    .returning();

  // Trigger async matching (fire and forget with error logging)
  if (embedding) {
    runMatchingForItem(itemId, 'lost').catch((err) =>
      logger.error({ err, itemId }, 'Background matching failed'),
    );
  }

  logger.info({ itemId, userId: params.userId }, 'Lost item created');
  return item;
}

// ── Post Found Item ───────────────────────────────────────────────────────────
export async function createFoundItem(params: {
  userId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  location?: string | null;
  dateFound?: string | null;
  foundMode: 'left_at_location' | 'keeping';
  contactEmail?: string | null;
  isAnonymous: boolean;
  formData: FormData;
}) {
  // Business rule: keeping mode requires contact email
  if (params.foundMode === 'keeping' && !params.contactEmail) {
    throw new HTTPException(422, {
      message: 'Contact email is required when finder is keeping the item',
    });
  }

  // Business rule: anonymous posting not allowed for found items
  if (params.isAnonymous) {
    throw new HTTPException(422, {
      message: 'Anonymous posting is not allowed for found items',
    });
  }

  const db = getDb();
  const itemId = randomUUID();

  let imageKey: string | null = null;
  let imageUrl: string | null = null;
  let thumbnailUrl: string | null = null;
  let aiMetadata: schema.NewItem['aiMetadata'] = null;
  let embedding: number[] | null = null;
  let verificationQuestion: string | null = null;
  let verificationAnswerHash: string | null = null;

  const fileData = await extractFileWithMeta(params.formData, 'image');
  if (fileData) {
    const upload = await processAndUploadItemImage(
      fileData.buffer,
      fileData.name,
      params.userId,
      itemId,
    );

    imageKey = upload.key;
    imageUrl = upload.cdnUrl;
    thumbnailUrl = upload.thumbnailCdnUrl ?? null;

    const aiResult = await analyzeItemPipeline({
      imageBase64: upload.base64,
      mimeType: upload.mimeType,
      title: params.title,
      description: params.description,
      location: params.location,
    });

    verificationQuestion = aiResult.verificationQuestion;

    // Pre-hash the verification answer hint for comparison
    if (aiResult.verificationQuestion) {
      // The answer hint is stored hashed; actual answer comes from claim
      verificationAnswerHash = null; // set when claim is verified
    }

    aiMetadata = {
      detectedObjects: aiResult.visionResult.detectedObjects,
      colors: aiResult.visionResult.colors,
      brand: aiResult.visionResult.brand,
      condition: aiResult.visionResult.condition,
      distinctiveFeatures: aiResult.visionResult.distinctiveFeatures,
      verificationQuestion,
      verificationAnswerHash,
      confidence: aiResult.visionResult.confidence,
    };
    embedding = aiResult.embedding;
  }

  const [item] = await db
    .insert(schema.items)
    .values({
      id: itemId,
      userId: params.userId,
      type: 'found',
      title: params.title,
      description: params.description ?? null,
      category: params.category ?? null,
      location: params.location ?? null,
      dateOccurred: params.dateFound ?? null,
      imageKey,
      imageUrl,
      thumbnailUrl,
      foundMode: params.foundMode,
      contactEmail: params.contactEmail ?? null,
      isAnonymous: false,
      aiMetadata,
      embedding,
      status: 'active',
    })
    .returning();

  // Trigger matching
  if (embedding) {
    runMatchingForItem(itemId, 'found').catch((err) =>
      logger.error({ err, itemId }, 'Background matching failed'),
    );
  }

  logger.info({ itemId, userId: params.userId, foundMode: params.foundMode }, 'Found item created');
  return item;
}

// ── Feed ──────────────────────────────────────────────────────────────────────
export async function getItemFeed(params: {
  cursor?: string;
  limit: number;
  type?: 'lost' | 'found';
  category?: string;
  location?: string;
  status?: string;
  userId?: string;
}) {
  const db = getDb();
  const status = (params.status ?? 'active') as 'active' | 'resolved' | 'expired';
  const fetchLimit = params.limit + 1; // fetch one extra to determine hasMore

  const conditions = [eq(schema.items.status, status)];

  if (params.type) {
    conditions.push(eq(schema.items.type, params.type));
  }

  if (params.category) {
    conditions.push(eq(schema.items.category, params.category));
  }

  if (params.location) {
    conditions.push(ilike(schema.items.location, `%${params.location}%`));
  }

  if (params.userId) {
    conditions.push(eq(schema.items.userId, params.userId));
  }

  if (params.cursor) {
    conditions.push(lt(schema.items.createdAt, new Date(params.cursor)));
  }

  const rows = await db
    .select({
      id: schema.items.id,
      userId: schema.items.userId,
      type: schema.items.type,
      title: schema.items.title,
      description: schema.items.description,
      category: schema.items.category,
      location: schema.items.location,
      dateOccurred: schema.items.dateOccurred,
      imageUrl: schema.items.imageUrl,
      thumbnailUrl: schema.items.thumbnailUrl,
      status: schema.items.status,
      foundMode: schema.items.foundMode,
      contactEmail: schema.items.contactEmail,
      isAnonymous: schema.items.isAnonymous,
      aiMetadata: schema.items.aiMetadata,
      createdAt: schema.items.createdAt,
      updatedAt: schema.items.updatedAt,
      userDisplayName: schema.users.displayName,
    })
    .from(schema.items)
    .leftJoin(schema.users, eq(schema.items.userId, schema.users.id))
    .where(and(...conditions))
    .orderBy(desc(schema.items.createdAt))
    .limit(fetchLimit);

  const hasMore = rows.length > params.limit;
  const pageRows = hasMore ? rows.slice(0, params.limit) : rows;
  const lastRow = pageRows[pageRows.length - 1];

  return {
    items: pageRows.map(serializeItem),
    next_cursor: hasMore && lastRow ? lastRow.createdAt.toISOString() : null,
    has_more: hasMore,
  };
}

// ── Semantic Search ───────────────────────────────────────────────────────────
export async function searchItemsByEmbedding(params: {
  queryEmbedding: number[];
  type?: 'lost' | 'found';
  limit: number;
}) {
  const db = getDb();
  const { queryEmbedding, type, limit } = params;

  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const result = await db.execute(
    sql`
      SELECT
        i.id,
        i.user_id,
        i.type,
        i.title,
        i.description,
        i.category,
        i.location,
        i.date_occurred,
        i.image_url,
        i.thumbnail_url,
        i.status,
        i.ai_metadata,
        i.created_at,
        (1 - (i.embedding <=> ${embeddingStr}::vector))::float AS similarity
      FROM items i
      WHERE
        i.status = 'active'
        AND i.embedding IS NOT NULL
        ${type ? sql`AND i.type = ${type}` : sql``}
      ORDER BY i.embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `,
  );

  return (result as unknown) as Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    category: string | null;
    location: string | null;
    image_url: string | null;
    thumbnail_url: string | null;
    status: string;
    created_at: Date;
    similarity: number;
  }>;
}

// ── Get Single Item ───────────────────────────────────────────────────────────
export async function getItemById(itemId: string) {
  const db = getDb();
  const [item] = await db
    .select()
    .from(schema.items)
    .where(eq(schema.items.id, itemId))
    .limit(1);
  return item ?? null;
}

export async function updateItemStatus(
  itemId: string,
  userId: string,
  status: 'active' | 'resolved' | 'expired',
) {
  const db = getDb();
  const [item] = await db
    .select()
    .from(schema.items)
    .where(and(eq(schema.items.id, itemId), eq(schema.items.userId, userId)))
    .limit(1);

  if (!item) {
    throw new HTTPException(404, { message: 'Item not found or not owned by user' });
  }

  const [updated] = await db
    .update(schema.items)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.items.id, itemId))
    .returning();

  return updated;
}
