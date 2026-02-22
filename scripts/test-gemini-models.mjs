/**
 * Brute-force test: which Gemini models + API versions work with your API key?
 * Run: node scripts/test-gemini-models.mjs
 */

import 'dotenv/config';

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  console.error('GOOGLE_AI_API_KEY not set in environment');
  process.exit(1);
}

console.log(`API Key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`);
console.log('');

// Step 1: List all available models for each API version
const API_VERSIONS = ['v1', 'v1beta'];

for (const version of API_VERSIONS) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Listing models for API version: ${version}`);
  console.log('='.repeat(60));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/${version}/models?key=${API_KEY}`
    );
    if (!res.ok) {
      console.log(`  ERROR ${res.status}: ${await res.text()}`);
      continue;
    }
    const data = await res.json();
    const models = data.models || [];

    // Filter for embedding models
    const embeddingModels = models.filter(m =>
      m.supportedGenerationMethods?.includes('embedContent')
    );
    const generativeModels = models.filter(m =>
      m.supportedGenerationMethods?.includes('generateContent')
    );

    console.log(`\n  Total models: ${models.length}`);
    console.log(`  Embedding models (embedContent): ${embeddingModels.length}`);
    embeddingModels.forEach(m => {
      console.log(`    - ${m.name} (${m.displayName || 'no display name'})`);
      console.log(`      Methods: ${m.supportedGenerationMethods?.join(', ')}`);
      if (m.outputTokenLimit) console.log(`      Output dim: ${m.outputTokenLimit}`);
    });

    console.log(`\n  Generative models (generateContent): ${generativeModels.length}`);
    generativeModels.slice(0, 10).forEach(m => {
      console.log(`    - ${m.name} (${m.displayName || 'no display name'})`);
    });
    if (generativeModels.length > 10) {
      console.log(`    ... and ${generativeModels.length - 10} more`);
    }
  } catch (err) {
    console.log(`  FETCH ERROR: ${err.message}`);
  }
}

// Step 2: Test specific embedding model + version combinations
console.log(`\n\n${'='.repeat(60)}`);
console.log('Testing embedding model + API version combinations');
console.log('='.repeat(60));

const EMBEDDING_MODELS = [
  'text-embedding-004',
  'text-embedding-005',
  'embedding-001',
  'embedding-002',
  'models/text-embedding-004',
  'models/text-embedding-005',
  'models/embedding-001',
  'gemini-embedding-exp',
  'text-multilingual-embedding-002',
];

const testText = 'Lost black backpack near library';

for (const version of API_VERSIONS) {
  for (const model of EMBEDDING_MODELS) {
    const modelPath = model.startsWith('models/') ? model : `models/${model}`;
    const url = `https://generativelanguage.googleapis.com/${version}/${modelPath}:embedContent?key=${API_KEY}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: testText }] },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const dim = data.embedding?.values?.length || 0;
        console.log(`  ✅ ${version} / ${model} → SUCCESS (dim=${dim})`);
      } else {
        const errText = await res.text();
        const short = errText.slice(0, 100);
        console.log(`  ❌ ${version} / ${model} → ${res.status} ${short}`);
      }
    } catch (err) {
      console.log(`  ❌ ${version} / ${model} → FETCH ERROR: ${err.message}`);
    }
  }
}

// Step 3: Test vision model availability
console.log(`\n\n${'='.repeat(60)}`);
console.log('Testing vision/generative models');
console.log('='.repeat(60));

const VISION_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-pro-vision',
];

for (const model of VISION_MODELS) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say hello in one word' }] }],
      }),
    });

    if (res.ok) {
      console.log(`  ✅ ${model} → SUCCESS`);
    } else if (res.status === 429) {
      console.log(`  ⚠️  ${model} → 429 RATE LIMITED (model exists but quota exceeded)`);
    } else {
      const errText = await res.text();
      const short = errText.slice(0, 120);
      console.log(`  ❌ ${model} → ${res.status} ${short}`);
    }
  } catch (err) {
    console.log(`  ❌ ${model} → FETCH ERROR: ${err.message}`);
  }
}

console.log('\nDone!');
