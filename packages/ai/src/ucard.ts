import { getVisionModel } from './gemini.js';
import { withRetry } from './retry.js';

export interface UCardExtractionResult {
  spireId: string | null;
  lastName: string | null;
  firstName: string | null;
  confidence: number;
  isUMassCard: boolean;
}

const UCARD_PROMPT = `Analyze this image. It may be a UMass Amherst ID card (UCard).

A UMass UCard typically has: "UMass Amherst" text, the person's name and 8-digit SPIRE ID, a profile photo on the left, the Sam Minuteman mascot on the right, a barcode at the bottom, and often a Library ID. Maroon/black colors. Treat any university or college ID card with an 8-digit number as valid.

Extract the following and respond with JSON ONLY (no markdown):
{
  "spireId": "the 8-digit number if visible (SPIRE ID), or null",
  "lastName": "the person's last name as printed, or null",
  "firstName": "the person's first name as printed, or null",
  "confidence": 0.95,
  "isUMassCard": true
}

Rules:
- SPIRE ID is an 8-digit number (e.g. 12345678). Return as string or null.
- Set isUMassCard: true if this looks like ANY university/college ID card (UMass, student ID, faculty ID, etc.)
- Set isUMassCard: true if you see an 8-digit ID number that could be a SPIRE ID, even if you're not 100% sure it's UMass
- Return null for spireId only if you cannot clearly read an 8-digit number
- NEVER guess or fabricate ID numbers`;

export async function extractUCardData(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<UCardExtractionResult> {
  const model = getVisionModel();

  try {
    const result = await withRetry(() =>
      model.generateContent([UCARD_PROMPT, { inlineData: { data: imageBase64, mimeType } }]),
    );

    const response = result.response.text().trim();
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
    // API error, blocked content, or parse failure: return safe default.
    // isUMassCard: true so the service accepts for manual review instead of rejecting.
    return { spireId: null, lastName: null, firstName: null, confidence: 0, isUMassCard: true };
  }
}

export function isValidSpireId(spireId: string): boolean {
  return /^\d{8}$/.test(spireId.trim());
}
