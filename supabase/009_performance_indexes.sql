-- 009_performance_indexes.sql — Índices, funciones RPC y optimizaciones para escala
-- Ejecutar manualmente en DB existente: python scripts/run_migrations.py --patch 009

-- ─── Índices para consultas frecuentes ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_institution_role_status
  ON users (institution_id, role, status)
  WHERE institution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_role_status
  ON users (role, status);

CREATE INDEX IF NOT EXISTS idx_chats_user_type_updated
  ON chats (user_id, chat_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chats_user_updated
  ON chats (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id
  ON messages (chat_id);

CREATE INDEX IF NOT EXISTS idx_mood_checkins_user_created
  ON mood_checkins (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_psychometric_user_status
  ON psychometric_assessments (user_id, status);

CREATE INDEX IF NOT EXISTS idx_psychometric_institution_status
  ON psychometric_assessments (institution_id, status)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_opportunities_institution_active
  ON opportunities (institution_id, is_active)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_resource_embeddings_resource_id
  ON resource_embeddings (resource_id);

CREATE INDEX IF NOT EXISTS idx_saved_resources_user_id
  ON saved_resources (user_id);

CREATE INDEX IF NOT EXISTS idx_student_progress_user_id
  ON student_progress (user_id);

CREATE INDEX IF NOT EXISTS idx_resources_institution_id
  ON resources (institution_id);

CREATE INDEX IF NOT EXISTS idx_interventions_student_created
  ON interventions (student_id, created_at DESC);

-- Vector search: HNSW para match_embeddings() a escala
CREATE INDEX IF NOT EXISTS idx_resource_embeddings_hnsw
  ON resource_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─── Agregados institucionales en una sola pasada SQL ────────────────────────

CREATE OR REPLACE FUNCTION institution_dashboard_stats(p_institution_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH students AS (
    SELECT id
    FROM users
    WHERE institution_id = p_institution_id
      AND role = 'student'
      AND status = 'approved'
  ),
  week_boundary AS (
    SELECT (NOW() AT TIME ZONE 'UTC' - INTERVAL '7 days') AS ts
  ),
  engagement AS (
    SELECT
      (SELECT COUNT(*)::INT FROM students) AS enrollment,
      (
        SELECT COUNT(DISTINCT c.user_id)::INT
        FROM chats c
        INNER JOIN students s ON s.id = c.user_id
        CROSS JOIN week_boundary w
        WHERE c.updated_at >= w.ts
      ) AS active_7d,
      (
        SELECT COUNT(*)::INT
        FROM chats c
        INNER JOIN students s ON s.id = c.user_id
      ) AS chats_count,
      (
        SELECT COUNT(*)::INT
        FROM messages m
        INNER JOIN chats c ON c.id = m.chat_id
        INNER JOIN students s ON s.id = c.user_id
      ) AS messages_count,
      (
        SELECT COUNT(*)::INT
        FROM psychometric_assessments
        WHERE institution_id = p_institution_id
          AND status = 'completed'
      ) AS psychometric_count,
      (
        SELECT COUNT(*)::INT
        FROM saved_resources sr
        INNER JOIN students s ON s.id = sr.user_id
      ) AS saved_count,
      (
        SELECT COALESCE(AVG(sp.progress_percent), 0)::FLOAT
        FROM student_progress sp
        INNER JOIN students s ON s.id = sp.user_id
      ) AS avg_progress,
      (
        SELECT COALESCE(AVG(srr.risk_score), 0)::FLOAT
        FROM (
          SELECT DISTINCT ON (user_id) user_id, risk_score, risk_level
          FROM student_risk_reports
          WHERE institution_id = p_institution_id
          ORDER BY user_id, computed_at DESC
        ) srr
      ) AS avg_risk_score,
      (
        SELECT COUNT(*)::INT
        FROM (
          SELECT DISTINCT ON (user_id) user_id, risk_level
          FROM student_risk_reports
          WHERE institution_id = p_institution_id
          ORDER BY user_id, computed_at DESC
        ) srr
        WHERE srr.risk_level IN ('alto', 'moderado')
      ) AS at_risk_count
  )
  SELECT json_build_object(
    'enrollment', enrollment,
    'active_7d', active_7d,
    'chats_count', chats_count,
    'messages_count', messages_count,
    'psychometric_count', psychometric_count,
    'saved_count', saved_count,
    'avg_progress', avg_progress,
    'avg_risk_score', avg_risk_score,
    'at_risk_count', at_risk_count
  )
  FROM engagement;
$$;

-- ─── Último reporte de riesgo por estudiante (DISTINCT ON) ───────────────────

CREATE OR REPLACE FUNCTION latest_risk_by_institution(p_institution_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  program TEXT,
  semester INT,
  institution_id UUID,
  risk_level TEXT,
  risk_score NUMERIC,
  factors JSONB,
  computed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    COALESCE(u.full_name, u.email) AS full_name,
    u.email,
    sp.program,
    sp.semester,
    srr.institution_id,
    srr.risk_level,
    srr.risk_score,
    srr.factors,
    srr.computed_at
  FROM users u
  LEFT JOIN student_profiles sp ON sp.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT institution_id, risk_level, risk_score, factors, computed_at
    FROM student_risk_reports
    WHERE user_id = u.id
      AND institution_id = p_institution_id
    ORDER BY computed_at DESC
    LIMIT 1
  ) srr ON TRUE
  WHERE u.institution_id = p_institution_id
    AND u.role = 'student'
    AND u.status = 'approved'
  ORDER BY srr.risk_score DESC NULLS LAST, u.full_name;
$$;

-- ─── Conteo de plataforma sin full table scan en memoria ─────────────────────

CREATE OR REPLACE FUNCTION platform_dashboard_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*)::INT FROM users),
    'total_institutions', (SELECT COUNT(*)::INT FROM institutions),
    'active_institutions', (
      SELECT COUNT(*)::INT FROM institutions WHERE is_active = TRUE
    ),
    'pending_requests', (
      SELECT COUNT(*)::INT FROM registration_requests WHERE status = 'pending'
    ),
    'unlinked_users', (
      SELECT COUNT(*)::INT FROM users
      WHERE institution_id IS NULL
        AND role <> 'platform_admin'
    )
  );
$$;
