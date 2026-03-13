// CloudSQL PostgreSQL + pgvector connection pool
// Persistent pool reused across requests (Cloud Run advantage over Cloud Functions)

import pg from 'pg';
const { Pool } = pg;

let pool = null;

export async function initDB() {
  if (pool) return pool;

  // Cloud Run connects via Unix socket when using Cloud SQL Auth Proxy sidecar
  // For direct connection, use PGHOST/PGPORT
  const config = {
    user: process.env.PGUSER || 'uilson',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'uilson',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  // Cloud SQL Auth Proxy uses Unix domain socket
  if (process.env.INSTANCE_UNIX_SOCKET) {
    config.host = process.env.INSTANCE_UNIX_SOCKET;
  } else {
    config.host = process.env.PGHOST || '127.0.0.1';
    config.port = parseInt(process.env.PGPORT || '5432');
  }

  pool = new Pool(config);

  // Test connection & init schema
  const client = await pool.connect();
  try {
    console.log('[DB] Connected to PostgreSQL');

    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('[DB] pgvector extension enabled');

    // Create tables
    await client.query(`
      -- Long-term memory: semantic search with pgvector
      CREATE TABLE IF NOT EXISTS memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        content TEXT NOT NULL,
        embedding vector(768),
        metadata JSONB DEFAULT '{}',
        importance REAL DEFAULT 0.5,
        access_count INT DEFAULT 0,
        last_accessed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- User preferences (self-editing memory writes here)
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value JSONB NOT NULL,
        source TEXT DEFAULT 'llm_inferred',
        confidence REAL DEFAULT 0.5,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, key)
      );

      -- Work patterns (auto-detected by LLM)
      CREATE TABLE IF NOT EXISTS work_patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        pattern_type TEXT NOT NULL,
        description TEXT NOT NULL,
        frequency TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Conversation logs for analytics
      CREATE TABLE IF NOT EXISTS conversation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        session_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_calls JSONB,
        tokens_used INT DEFAULT 0,
        latency_ms INT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Suggestion analytics
      CREATE TABLE IF NOT EXISTS suggestion_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        suggestion_type TEXT NOT NULL,
        content TEXT NOT NULL,
        was_clicked BOOLEAN DEFAULT FALSE,
        was_helpful BOOLEAN,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(user_id, category);
      CREATE INDEX IF NOT EXISTS idx_prefs_user ON user_preferences(user_id);
      CREATE INDEX IF NOT EXISTS idx_patterns_user ON work_patterns(user_id);
      CREATE INDEX IF NOT EXISTS idx_convlogs_user ON conversation_logs(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sugglogs_user ON suggestion_logs(user_id, created_at DESC);
    `);

    // Create HNSW index for vector search (if not exists)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_memories_embedding') THEN
          CREATE INDEX idx_memories_embedding ON memories
          USING hnsw (embedding vector_cosine_ops)
          WITH (m = 16, ef_construction = 64);
        END IF;
      END $$;
    `);

    console.log('[DB] Schema initialized');
  } finally {
    client.release();
  }

  return pool;
}

export function getDB() {
  if (!pool) throw new Error('DB not initialized');
  return pool;
}

// ── Memory operations ──

export async function searchMemories(userId, embedding, limit = 5, category = null) {
  const db = getDB();
  const vecStr = `[${embedding.join(',')}]`;

  let query = `
    SELECT id, category, content, metadata, importance,
           1 - (embedding <=> $1::vector) AS similarity
    FROM memories
    WHERE user_id = $2
  `;
  const params = [vecStr, userId];

  if (category) {
    query += ` AND category = $3`;
    params.push(category);
  }

  query += ` ORDER BY embedding <=> $1::vector LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await db.query(query, params);

  // Update access counts
  if (result.rows.length > 0) {
    const ids = result.rows.map(r => r.id);
    await db.query(
      `UPDATE memories SET access_count = access_count + 1, last_accessed_at = NOW() WHERE id = ANY($1)`,
      [ids]
    );
  }

  return result.rows;
}

export async function saveMemory(userId, content, embedding, category = 'general', metadata = {}, importance = 0.5) {
  const db = getDB();
  const vecStr = `[${embedding.join(',')}]`;

  const result = await db.query(
    `INSERT INTO memories (user_id, category, content, embedding, metadata, importance)
     VALUES ($1, $2, $3, $4::vector, $5, $6)
     RETURNING id`,
    [userId, category, content, vecStr, JSON.stringify(metadata), importance]
  );
  return result.rows[0].id;
}

export async function saveUserPreference(userId, key, value, source = 'llm_inferred', confidence = 0.5) {
  const db = getDB();
  await db.query(
    `INSERT INTO user_preferences (user_id, key, value, source, confidence, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id, key) DO UPDATE SET
       value = EXCLUDED.value,
       source = EXCLUDED.source,
       confidence = GREATEST(user_preferences.confidence, EXCLUDED.confidence),
       updated_at = NOW()`,
    [userId, key, JSON.stringify(value), source, confidence]
  );
}

export async function getUserPreferences(userId) {
  const db = getDB();
  const result = await db.query(
    `SELECT key, value, confidence, updated_at FROM user_preferences WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function logWorkPattern(userId, patternType, description, metadata = {}) {
  const db = getDB();
  await db.query(
    `INSERT INTO work_patterns (user_id, pattern_type, description, metadata) VALUES ($1, $2, $3, $4)`,
    [userId, patternType, description, JSON.stringify(metadata)]
  );
}

export async function logConversation(userId, sessionId, role, content, toolCalls = null, tokensUsed = 0, latencyMs = 0) {
  const db = getDB();
  await db.query(
    `INSERT INTO conversation_logs (user_id, session_id, role, content, tool_calls, tokens_used, latency_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, sessionId, role, content, toolCalls ? JSON.stringify(toolCalls) : null, tokensUsed, latencyMs]
  );
}
