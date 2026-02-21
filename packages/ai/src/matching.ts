export interface MatchCandidate {
  id: string;
  similarity: number;
  title: string;
  imageUrl?: string | null;
  location?: string | null;
  category?: string | null;
  type: 'lost' | 'found';
  createdAt: Date | string;
}

export const MATCH_THRESHOLD = 0.8;
export const MAX_MATCHES = 5;

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;
  return dotProduct / magnitude;
}

export function similarityToConfidence(score: number): string {
  if (score >= 0.95) return 'Very High';
  if (score >= 0.85) return 'High';
  if (score >= 0.75) return 'Medium';
  if (score >= 0.65) return 'Low';
  return 'Very Low';
}
