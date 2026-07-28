-- Psychology appointments + vocational assessments

CREATE TABLE IF NOT EXISTS psychology_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counselor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  proposed_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  counselor_note TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psych_appt_student
  ON psychology_appointments(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_psych_appt_counselor_status
  ON psychology_appointments(institution_id, status, proposed_at);

CREATE TABLE IF NOT EXISTS vocational_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed')),
  recommended_programs JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vocational_inst
  ON vocational_assessments(institution_id, status);

ALTER TABLE psychology_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocational_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS psych_appt_select ON psychology_appointments;
CREATE POLICY psych_appt_select ON psychology_appointments FOR SELECT USING (
  student_id = auth.uid()
  OR is_any_admin()
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.status = 'approved'
      AND (u.role = 'psychologist' OR lower(u.email) = 'psicologo@utb.edu.co')
      AND u.institution_id = psychology_appointments.institution_id
  )
);

DROP POLICY IF EXISTS psych_appt_insert ON psychology_appointments;
CREATE POLICY psych_appt_insert ON psychology_appointments FOR INSERT WITH CHECK (
  student_id = auth.uid() AND is_approved_user()
);

DROP POLICY IF EXISTS psych_appt_update ON psychology_appointments;
CREATE POLICY psych_appt_update ON psychology_appointments FOR UPDATE USING (
  student_id = auth.uid()
  OR is_any_admin()
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.status = 'approved'
      AND (u.role = 'psychologist' OR lower(u.email) = 'psicologo@utb.edu.co')
      AND u.institution_id = psychology_appointments.institution_id
  )
);

DROP POLICY IF EXISTS vocational_select ON vocational_assessments;
CREATE POLICY vocational_select ON vocational_assessments FOR SELECT USING (
  user_id = auth.uid() OR is_any_admin()
);

DROP POLICY IF EXISTS vocational_insert ON vocational_assessments;
CREATE POLICY vocational_insert ON vocational_assessments FOR INSERT WITH CHECK (
  user_id = auth.uid() AND is_approved_user()
);

DROP POLICY IF EXISTS vocational_update ON vocational_assessments;
CREATE POLICY vocational_update ON vocational_assessments FOR UPDATE USING (
  user_id = auth.uid() OR is_any_admin()
);
