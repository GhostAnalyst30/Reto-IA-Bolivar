-- 010_users_management.sql — birth_date en perfiles + RPC de listado de usuarios
-- Ejecutar manualmente en DB existente: python scripts/run_migrations.py --patch 010

-- ─── Fecha de nacimiento para filtro por edad ────────────────────────────────

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Preguntas personalizadas del test (generadas por IA) junto con las respuestas
ALTER TABLE psychometric_assessments
  ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]';

-- ─── Listado de usuarios de una institución con perfil y último riesgo ───────
-- Evita N+1: una sola pasada con perfil de estudiante, edad calculada y
-- último reporte de riesgo. Usado por GET /institutional/users y /platform/users.

CREATE OR REPLACE FUNCTION institution_users_with_profile(p_institution_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  program TEXT,
  semester INT,
  birth_date DATE,
  age INT,
  risk_level TEXT,
  risk_score NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    u.email,
    COALESCE(u.full_name, u.email) AS full_name,
    u.role,
    u.status,
    u.created_at,
    sp.program,
    sp.semester,
    sp.birth_date,
    CASE
      WHEN sp.birth_date IS NOT NULL
      THEN DATE_PART('year', AGE(CURRENT_DATE, sp.birth_date))::INT
      ELSE NULL
    END AS age,
    srr.risk_level,
    srr.risk_score
  FROM users u
  LEFT JOIN student_profiles sp ON sp.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT risk_level, risk_score
    FROM student_risk_reports
    WHERE user_id = u.id
    ORDER BY computed_at DESC
    LIMIT 1
  ) srr ON TRUE
  WHERE u.institution_id = p_institution_id
    AND u.role <> 'platform_admin'
  ORDER BY u.created_at DESC;
$$;
