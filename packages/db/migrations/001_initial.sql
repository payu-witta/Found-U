-- FoundU Initial Migration
-- Requires pgvector extension enabled in Supabase dashboard

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE item_type AS ENUM ('lost', 'found'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE item_status AS ENUM ('active', 'resolved', 'expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE found_mode AS ENUM ('left_at_location', 'keeping'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE match_status AS ENUM ('pending', 'confirmed', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('match_found','claim_submitted','claim_approved','ucard_found','item_resolved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Items ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type item_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  location VARCHAR(255),
  date_occurred DATE,
  image_url TEXT,
  image_key VARCHAR(500),
  thumbnail_url TEXT,
  status item_status NOT NULL DEFAULT 'active',
  found_mode found_mode,
  contact_email VARCHAR(255),
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  ai_metadata JSONB,
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS items_type_idx ON items(type);
CREATE INDEX IF NOT EXISTS items_status_idx ON items(status);
CREATE INDEX IF NOT EXISTS items_user_idx ON items(user_id);
CREATE INDEX IF NOT EXISTS items_location_idx ON items(location);
CREATE INDEX IF NOT EXISTS items_created_at_idx ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS items_category_trgm_idx ON items USING GIN (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS items_title_trgm_idx ON items USING GIN (title gin_trgm_ops);

-- HNSW index for fast approximate nearest-neighbor vector search
CREATE INDEX IF NOT EXISTS items_embedding_hnsw_idx
  ON items USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE OR REPLACE TRIGGER items_set_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Matches ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lost_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  found_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  similarity_score REAL NOT NULL,
  status match_status NOT NULL DEFAULT 'pending',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lost_item_id, found_item_id)
);
CREATE INDEX IF NOT EXISTS matches_lost_item_idx ON matches(lost_item_id);
CREATE INDEX IF NOT EXISTS matches_found_item_idx ON matches(found_item_id);
CREATE INDEX IF NOT EXISTS matches_score_idx ON matches(similarity_score DESC);
CREATE OR REPLACE TRIGGER matches_set_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── Claims ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_question TEXT,
  verification_answer_hash TEXT,
  status claim_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE TRIGGER claims_set_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── UCard Recoveries ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ucard_recoveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finder_id UUID REFERENCES users(id) ON DELETE SET NULL,
  spire_id_hash TEXT NOT NULL,
  last_name_lower VARCHAR(255),
  image_key VARCHAR(500),
  image_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ucard_spire_hash_idx ON ucard_recoveries(spire_id_hash);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read) WHERE read = FALSE;

-- ── Refresh Tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_hash_idx ON refresh_tokens(token_hash);

-- ── Vector similarity search helper function ──────────────────────────────────
CREATE OR REPLACE FUNCTION search_items_by_embedding(
  query_embedding vector(768),
  item_type_filter item_type DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.7,
  result_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID, user_id UUID, type item_type, title VARCHAR(255),
  description TEXT, category VARCHAR(100), location VARCHAR(255),
  date_occurred DATE, image_url TEXT, thumbnail_url TEXT,
  status item_status, ai_metadata JSONB, similarity FLOAT, created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.user_id, i.type, i.title, i.description, i.category,
    i.location, i.date_occurred, i.image_url, i.thumbnail_url, i.status,
    i.ai_metadata, (1 - (i.embedding <=> query_embedding))::FLOAT AS similarity,
    i.created_at
  FROM items i
  WHERE i.status = 'active' AND i.embedding IS NOT NULL
    AND (item_type_filter IS NULL OR i.type = item_type_filter)
    AND (1 - (i.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY i.embedding <=> query_embedding
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
