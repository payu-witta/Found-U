import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const getApiKey = (): string => {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error('GOOGLE_AI_API_KEY is not set');
  return key;
};

let geminiClient: GoogleGenerativeAI | null = null;

export const getGeminiClient = (): GoogleGenerativeAI => {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(getApiKey());
  }
  return geminiClient;
};

export const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export const getVisionModel = () =>
  getGeminiClient().getGenerativeModel({
    model: 'gemini-2.5-flash-image',
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      maxOutputTokens: 2048,
    },
  });

export const getEmbeddingModel = () =>
  getGeminiClient().getGenerativeModel(
    { model: 'gemini-embedding-001' },
    { apiVersion: 'v1beta' },
  );
