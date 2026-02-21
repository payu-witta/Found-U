import { Hono } from 'hono';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import type { AppVariables } from '../types/index.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { analyzeItemPipeline, generateSearchEmbedding } from '../services/ai.service.js';
import { successResponse } from '../utils/helpers.js';
import { HTTPException } from 'hono/http-exception';

const ai = new Hono<AppVariables>();

/**
 * POST /ai/vision-analysis
 * Analyze an item image and return structured metadata.
 * Accepts multipart/form-data with `image` field.
 */
ai.post(
  '/vision-analysis',
  requireAuth(),
  rateLimit({ max: 20, windowMs: 60_000 }),
  async (c) => {
    const contentType = c.req.header('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      throw new HTTPException(415, { message: 'Expected multipart/form-data' });
    }

    const formData = await c.req.formData();
    const imageFile = formData.get('image');
    if (!imageFile || !(imageFile instanceof File)) {
      throw new HTTPException(400, { message: 'Missing image field' });
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';
    const title = (formData.get('title') as string | null) ?? 'Unknown item';
    const description = formData.get('description') as string | null;
    const location = formData.get('location') as string | null;

    const result = await analyzeItemPipeline({
      imageBase64: base64,
      mimeType,
      title,
      description,
      location,
    });

    return c.json(
      successResponse({
        category: result.visionResult.category,
        detectedObjects: result.visionResult.detectedObjects,
        colors: result.visionResult.colors,
        brand: result.visionResult.brand,
        condition: result.visionResult.condition,
        distinctiveFeatures: result.visionResult.distinctiveFeatures,
        confidence: result.visionResult.confidence,
        rawDescription: result.visionResult.rawDescription,
        verificationQuestion: result.verificationQuestion,
        embeddingDimensions: result.embedding.length,
      }),
    );
  },
);

/**
 * POST /ai/generate-embedding
 * Generate a text embedding vector for semantic search.
 */
ai.post(
  '/generate-embedding',
  requireAuth(),
  rateLimit({ max: 50, windowMs: 60_000 }),
  validate(
    'json',
    z.object({
      text: z.string().min(1).max(2000),
    }),
  ),
  async (c) => {
    const { text } = c.req.valid('json');
    const embedding = await generateSearchEmbedding(text);

    return c.json(
      successResponse({
        embedding,
        dimensions: embedding.length,
        model: 'text-embedding-004',
      }),
    );
  },
);

export default ai;
