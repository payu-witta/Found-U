import { getVisionModel } from './gemini.js';
import { withRetry } from './retry.js';

export interface VisionAnalysisResult {
  detectedObjects: string[];
  colors: string[];
  brand: string | null;
  condition: string;
  distinctiveFeatures: string[];
  category: string;
  confidence: number;
  rawDescription: string;
}

export interface VerificationResult {
  question: string;
  answerHint: string;
}

const VISION_PROMPT = `Analyze this lost/found item image and respond with a JSON object ONLY (no markdown, no extra text).

The JSON must have exactly these fields:
{
  "detectedObjects": ["array of objects visible in the image"],
  "colors": ["array of primary colors"],
  "brand": "brand name or null if unknown",
  "condition": "excellent|good|fair|poor",
  "distinctiveFeatures": ["array of unique features like scratches, stickers, engravings, damage"],
  "category": "Electronics|Clothing|Accessories|Books|Keys|Cards|Bags|Sports|Musical Instruments|Other",
  "confidence": 0.95,
  "rawDescription": "2-3 sentence description of the item"
}`;

const VERIFICATION_PROMPT = `Analyze this found item image to generate an ownership verification question.

Ask about a specific detail that:
1. Would NOT be visible in any public post
2. Only the true owner would know
3. Has a clear, unambiguous answer

Respond with JSON ONLY:
{
  "question": "Specific question about a hidden detail",
  "answerHint": "Expected answer in 1-3 words"
}`;

export async function analyzeItemImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<VisionAnalysisResult> {
  const model = getVisionModel();

  const result = await withRetry(() =>
    model.generateContent([VISION_PROMPT, { inlineData: { data: imageBase64, mimeType } }]),
  );

  const response = result.response.text().trim();

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as VisionAnalysisResult;

    return {
      detectedObjects: parsed.detectedObjects || [],
      colors: parsed.colors || [],
      brand: parsed.brand || null,
      condition: parsed.condition || 'unknown',
      distinctiveFeatures: parsed.distinctiveFeatures || [],
      category: parsed.category || 'Other',
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      rawDescription: parsed.rawDescription || '',
    };
  } catch {
    return {
      detectedObjects: [],
      colors: [],
      brand: null,
      condition: 'unknown',
      distinctiveFeatures: [],
      category: 'Other',
      confidence: 0.1,
      rawDescription: response.substring(0, 500),
    };
  }
}

export async function generateVerificationQuestion(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<VerificationResult> {
  const model = getVisionModel();

  const result = await withRetry(() =>
    model.generateContent([VERIFICATION_PROMPT, { inlineData: { data: imageBase64, mimeType } }]),
  );

  const response = result.response.text().trim();

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as VerificationResult;
    return {
      question: parsed.question || 'Describe a unique feature of your item not visible in the post.',
      answerHint: parsed.answerHint || '',
    };
  } catch {
    return {
      question: 'What distinctive marking or feature does your item have that is not shown publicly?',
      answerHint: '',
    };
  }
}
