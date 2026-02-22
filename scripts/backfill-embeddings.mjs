/**
 * Backfill embeddings for items that have zero-vector or NULL embeddings.
 * Run from repo root: node --env-file=.env scripts/backfill-embeddings.mjs
 */

const API_KEY = process.env.GOOGLE_AI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!API_KEY || !DATABASE_URL) {
  console.error('Missing GOOGLE_AI_API_KEY or DATABASE_URL in environment');
  process.exit(1);
}

// Use native fetch + raw SQL via Supabase REST, or use postgres from pnpm store
const { default: postgres } = await import('../node_modules/.pnpm/postgres@3.4.8/node_modules/postgres/src/index.js');

const sql = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  prepare: false,
});

async function generateEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.embedding?.values;
}

function composeText(item) {
  const parts = [`Title: ${item.title}`];
  if (item.description) parts.push(`Description: ${item.description}`);
  if (item.category) parts.push(`Category: ${item.category}`);
  if (item.location) parts.push(`Location: ${item.location}`);

  if (item.ai_metadata) {
    const meta = typeof item.ai_metadata === 'string'
      ? JSON.parse(item.ai_metadata)
      : item.ai_metadata;
    if (meta.detectedObjects?.length) parts.push(`Objects: ${meta.detectedObjects.join(', ')}`);
    if (meta.colors?.length) parts.push(`Colors: ${meta.colors.join(', ')}`);
    if (meta.brand) parts.push(`Brand: ${meta.brand}`);
    if (meta.distinctiveFeatures?.length) parts.push(`Features: ${meta.distinctiveFeatures.join(', ')}`);
  }

  return parts.join('\n');
}

// Find items with zero or null embeddings
const items = await sql`
  SELECT id, title, description, category, location, ai_metadata, embedding
  FROM items
  WHERE embedding IS NULL
     OR embedding = ${`[${new Array(768).fill(0).join(',')}]`}::vector
`;

console.log(`Found ${items.length} items needing embedding backfill`);

let success = 0;
let failed = 0;

for (const item of items) {
  try {
    const text = composeText(item);
    console.log(`  Processing ${item.id}: "${item.title.slice(0, 40)}..." `);

    const embedding = await generateEmbedding(text);
    if (!embedding || embedding.length === 0) {
      console.log(`    SKIP: empty embedding`);
      failed++;
      continue;
    }

    const vectorStr = `[${embedding.join(',')}]`;
    await sql`UPDATE items SET embedding = ${vectorStr}::vector WHERE id = ${item.id}`;
    console.log(`    OK (dim=${embedding.length})`);
    success++;

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  } catch (err) {
    console.error(`    FAIL: ${err.message}`);
    failed++;
  }
}

console.log(`\nDone! ${success} updated, ${failed} failed out of ${items.length} total`);
await sql.end();
