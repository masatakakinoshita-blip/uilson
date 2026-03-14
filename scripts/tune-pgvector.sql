-- ===========================================
-- pgvector チューニングスクリプト
-- Cloud Shell で実行:
--   gcloud sql connect uilson-db --user=uilson --database=uilson < scripts/tune-pgvector.sql
-- ===========================================

-- 1. 現在のテーブル状況を確認
SELECT '=== テーブルサイズ ===' AS info;
SELECT tablename,
       pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS total_size,
       (SELECT count(*) FROM memories WHERE tablename = 'memories'
        UNION ALL SELECT count(*) FROM user_preferences WHERE tablename = 'user_preferences'
        UNION ALL SELECT count(*) FROM work_patterns WHERE tablename = 'work_patterns'
        UNION ALL SELECT count(*) FROM conversation_logs WHERE tablename = 'conversation_logs'
        UNION ALL SELECT count(*) FROM suggestion_logs WHERE tablename = 'suggestion_logs'
        LIMIT 1) AS approx_rows
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC;

-- 2. HNSW インデックスを再構築 (ef_construction=64 → 200)
-- より高品質なグラフ構造でリコール率が向上
-- ビルド時間は増加するがクエリ品質が改善
SELECT '=== HNSW インデックス再構築 ===' AS info;

-- maintenance_work_mem を一時的に増加（インデックス構築用）
SET maintenance_work_mem = '256MB';

-- 既存インデックスを削除して再作成
DROP INDEX IF EXISTS idx_memories_embedding;
CREATE INDEX idx_memories_embedding ON memories
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

SELECT '  -> HNSW インデックス再構築完了 (m=16, ef_construction=200)' AS info;

-- 3. ef_search を設定（クエリ時のリコール率向上）
-- デフォルト 40 → 200 に変更
-- WHERE user_id = ? でフィルタリングしながらの近傍検索で特に効果的
SET hnsw.ef_search = 200;
SELECT '  -> ef_search=200 設定完了' AS info;

-- 4. created_at インデックス追加（時間ベースクエリ用）
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(user_id, created_at DESC);
SELECT '  -> idx_memories_created 作成完了' AS info;

-- 5. テーブル統計を更新（クエリプランナー最適化）
ANALYZE memories;
ANALYZE user_preferences;
ANALYZE work_patterns;
ANALYZE conversation_logs;
ANALYZE suggestion_logs;
SELECT '  -> ANALYZE 完了' AS info;

-- 6. 確認
SELECT '=== 最終確認 ===' AS info;
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'memories';
SHOW hnsw.ef_search;

SELECT '=== チューニング完了 ===' AS info;
