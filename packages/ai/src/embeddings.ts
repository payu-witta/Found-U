import { TaskType } from '@google/generative-ai';
import { getEmbeddingModel } from './gemini.js';
import { withRetry } from './retry.js';

export interface EmbeddingInput {
  title: string;
  description?: string | null;
  category?: string | null;
  location?: string | null;
  aiMetadata?: {
    detectedObjects?: string[];
    colors?: string[];
    brand?: string | null;
    distinctiveFeatures?: string[];
  } | null;
}

export function composeEmbeddingText(input: EmbeddingInput): string {
  const parts: string[] = [];

  parts.push(`Title: ${input.title}`);
  if (input.description) parts.push(`Description: ${input.description}`);
  if (input.category) parts.push(`Category: ${input.category}`);
  if (input.location) parts.push(`Location: ${input.location}`);

  if (input.aiMetadata) {
    const meta = input.aiMetadata;
    if (meta.detectedObjects?.length) parts.push(`Objects: ${meta.detectedObjects.join(', ')}`);
    if (meta.colors?.length) parts.push(`Colors: ${meta.colors.join(', ')}`);
    if (meta.brand) parts.push(`Brand: ${meta.brand}`);
    if (meta.distinctiveFeatures?.length) parts.push(`Features: ${meta.distinctiveFeatures.join(', ')}`);
  }

  return parts.join('\n');
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getEmbeddingModel();

  const request = {
    content: { parts: [{ text }], role: 'user' as const },
    taskType: TaskType.SEMANTIC_SIMILARITY,
    // Request 768 dims to match DB vector(768); Gemini API supports this param
    output_dimensionality: 768,
  };
  const result = await withRetry(() =>
    model.embedContent(request as Parameters<typeof model.embedContent>[0]),
  );

  const embedding = result.embedding.values;
  if (!embedding || embedding.length === 0) {
    throw new Error('Empty embedding returned from API');
  }

  return embedding;
}

export async function generateItemEmbedding(input: EmbeddingInput): Promise<number[]> {
  const text = composeEmbeddingText(input);
  return generateEmbedding(text);
}
