import { analyzeItemImage, generateVerificationQuestion } from '@foundu/ai';
import { generateItemEmbedding, generateEmbedding, composeEmbeddingText } from '@foundu/ai';
import type { VisionAnalysisResult } from '@foundu/ai';
import { logger } from '../lib/logger.js';

export interface ItemAIAnalysis {
  visionResult: VisionAnalysisResult;
  embedding: number[];
  verificationQuestion: string | null;
}

/**
 * Full AI analysis pipeline for a newly uploaded item image.
 * Returns vision metadata, embedding vector, and verification question.
 */
export async function analyzeItemPipeline(params: {
  imageBase64: string;
  mimeType: string;
  title: string;
  description?: string | null;
  location?: string | null;
}): Promise<ItemAIAnalysis> {
  const { imageBase64, mimeType, title, description, location } = params;

  // Run vision analysis and verification question generation in parallel
  const [visionResult, verificationResult] = await Promise.allSettled([
    analyzeItemImage(imageBase64, mimeType),
    generateVerificationQuestion(imageBase64, mimeType),
  ]);

  const vision =
    visionResult.status === 'fulfilled'
      ? visionResult.value
      : {
          detectedObjects: [],
          colors: [],
          brand: null,
          condition: 'unknown',
          distinctiveFeatures: [],
          category: 'Other',
          confidence: 0,
          rawDescription: '',
        };

  const verification = verificationResult.status === 'fulfilled' ? verificationResult.value : null;

  if (visionResult.status === 'rejected') {
    logger.warn({ error: visionResult.reason }, 'Vision analysis failed, using fallback');
  }

  // Generate embedding from combined text signals
  const embeddingText = composeEmbeddingText({
    title,
    description,
    category: vision.category,
    location,
    aiMetadata: {
      detectedObjects: vision.detectedObjects,
      colors: vision.colors,
      brand: vision.brand,
      distinctiveFeatures: vision.distinctiveFeatures,
    },
  });

  let embedding: number[];
  try {
    embedding = await generateEmbedding(embeddingText);
  } catch (err) {
    logger.error({ err }, 'Embedding generation failed');
    // Return zero vector as fallback — item will not match until re-processed
    embedding = new Array(768).fill(0);
  }

  return {
    visionResult: vision,
    embedding,
    verificationQuestion: verification?.question ?? null,
  };
}

/**
 * Generate embedding from text (for search queries).
 */
export async function generateSearchEmbedding(query: string): Promise<number[]> {
  return generateEmbedding(query);
}

/**
 * Generate a text description of an image using Gemini vision (for reverse image search).
 * Analogous to the form prefill pipeline but the result is not stored.
 */
export async function generateImageSearchDescription(
  imageBase64: string,
  mimeType: string,
): Promise<string> {
  const vision = await analyzeItemImage(imageBase64, mimeType);
  return composeEmbeddingText({
    title: vision.rawDescription || vision.detectedObjects.join(', '),
    aiMetadata: {
      detectedObjects: vision.detectedObjects,
      colors: vision.colors,
      brand: vision.brand,
      distinctiveFeatures: vision.distinctiveFeatures,
    },
  });
}

/**
 * Generate embedding from image for reverse image search.
 * Uses Gemini to create a text description, then embeds it (same as text search).
 */
export async function generateImageSearchEmbedding(
  imageBase64: string,
  mimeType: string,
): Promise<number[]> {
  const text = await generateImageSearchDescription(imageBase64, mimeType);
  return generateEmbedding(text);
}
