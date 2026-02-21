import { getVisionModel } from './gemini.js';

export interface UCardExtractionResult {
  spireId: string | null;
  lastName: string | null;
  firstName: string | null;
  confidence: number;
  isUMassCard: boolean;
}

const UCARD_PROMPT = `Analyze this UMass Amherst ID card (UCard) image.

Extract the following and respond with JSON ONLY (no markdown):
{
  "spireId": "the 8-digit SPIRE ID number if visible, or null",
  "lastName": "the person's last name as printed, or null",
  "firstName": "the person's first name as printed, or null",
  "confidence": 0.95,
  "isUMassCard": true
}

Rules:
- SPIRE ID is typically an 8-digit number on UMass ID cards
- Return null for spireId if you cannot clearly read it
- Only set isUMassCard: true if this appears to be a UMass Amherst ID card
- NEVER guess or fabricate ID numbers`;

export async function extractUCardData(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<UCardExtractionResult> {
  const model = getVisionModel();

  const result = await model.generateContent([
    UCARD_PROMPT,
    { inlineData: { data: imageBase64, mimeType } },
  ]);

  const response = result.response.text().trim();

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as UCardExtractionResult;

    return {
      spireId: parsed.spireId || null,
      lastName: parsed.lastName || null,
      firstName: parsed.firstName || null,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0)),
      isUMassCard: Boolean(parsed.isUMassCard),
    };
  } catch {
    return { spireId: null, lastName: null, firstName: null, confidence: 0, isUMassCard: false };
  }
}

export function isValidSpireId(spireId: string): boolean {
  return /^\d{8}$/.test(spireId.trim());
}
