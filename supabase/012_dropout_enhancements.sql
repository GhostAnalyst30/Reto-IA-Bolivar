-- RLS para gestión institucional de solicitudes de apoyo.
-- Columna dominant_cause en reportes de riesgo.

ALTER TABLE student_risk_reports
  ADD COLUMN IF NOT EXISTS dominant_cause TEXT;

CREATE POLICY support_requests_staff_update ON support_requests FOR UPDATE
  USING (is_any_admin());

-- Outcomes académicos (deserción real para calibración futura)
CREATE TABLE IF NOT EXISTS student_academic_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  enrollment_status TEXT NOT NULL CHECK (
    enrollment_status IN ('activo', 'aplazado', 'retirado', 'graduado')
  ),
  withdrawal_reason TEXT,
  effective_date DATE,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_outcomes_institution ON student_academic_outcomes(institution_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_status ON student_academic_outcomes(enrollment_status);

ALTER TABLE student_academic_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY outcomes_staff_read ON student_academic_outcomes FOR SELECT
  USING (is_any_admin());

CREATE POLICY outcomes_staff_write ON student_academic_outcomes FOR ALL
  USING (is_any_admin());

-- Scaffold registros académicos (notas/asistencia — integración ERP futura)
CREATE TABLE IF NOT EXISTS academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  course_code TEXT,
  course_name TEXT,
  grade NUMERIC,
  attendance_percent NUMERIC,
  failed BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academic_records_user ON academic_records(user_id, period);

ALTER TABLE academic_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY academic_records_staff ON academic_records FOR ALL
  USING (is_any_admin());

-- Pruning helper: conservar último reporte por estudiante por día
CREATE OR REPLACE FUNCTION prune_risk_reports_daily(p_institution_id UUID, p_before TIMESTAMPTZ)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, (computed_at AT TIME ZONE 'UTC')::date
             ORDER BY computed_at DESC
           ) AS rn
    FROM student_risk_reports
    WHERE institution_id = p_institution_id
      AND computed_at < p_before
  )
  DELETE FROM student_risk_reports
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
