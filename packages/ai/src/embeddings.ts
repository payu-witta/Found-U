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

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_API_VERSION = 'v1beta';
const EMBEDDING_DIMENSIONS = 768;

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set');

  const url = `https://generativelanguage.googleapis.com/${EMBEDDING_API_VERSION}/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const result = await withRetry(async () => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Embedding API error (${res.status}): ${errText}`);
    }

    return res.json() as Promise<{ embedding?: { values?: number[] } }>;
  });

  const embedding = result.embedding?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error('Empty embedding returned from API');
  }

  return embedding;
}

export async function generateItemEmbedding(input: EmbeddingInput): Promise<number[]> {
  const text = composeEmbeddingText(input);
  return generateEmbedding(text);
}
