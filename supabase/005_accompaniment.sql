-- 005_accompaniment.sql — Módulos acompañamiento UTB
-- Ejecutar después de 004_seed_demo_utb.sql

-- Perfil académico extendido
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT,
  program TEXT,
  semester INT,
  contact_preference TEXT DEFAULT 'email',
  twin_consent BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Encuesta psicométrica Likert
CREATE TABLE IF NOT EXISTS psychometric_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  responses JSONB NOT NULL DEFAULT '[]',
  status TEXT CHECK (status IN ('in_progress', 'completed')) DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Resumen Digital Twin básico
CREATE TABLE IF NOT EXISTS digital_twin_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  interests TEXT[] DEFAULT '{}',
  learning_style TEXT,
  emotional_baseline TEXT,
  summary_text TEXT,
  traits JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Oportunidades
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('beca', 'convocatoria', 'evento')),
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT[] DEFAULT '{}',
  area TEXT,
  tags TEXT[] DEFAULT '{}',
  deadline DATE,
  external_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_opportunities (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'applied')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, opportunity_id)
);

-- Escalada apoyo humano
CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'resolved')),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bienestar opcional
CREATE TABLE IF NOT EXISTS mood_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood_score INT NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Riesgo persistido
CREATE TABLE IF NOT EXISTS student_risk_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('bajo', 'moderado', 'alto')),
  risk_score NUMERIC NOT NULL DEFAULT 0,
  factors JSONB DEFAULT '[]',
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_institution ON student_risk_reports(institution_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_user ON student_risk_reports(user_id, computed_at DESC);

-- Intervenciones
CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  type TEXT NOT NULL DEFAULT 'academica',
  notes TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extender chats con tipo
ALTER TABLE chats ADD COLUMN IF NOT EXISTS chat_type TEXT DEFAULT 'digital_twin'
  CHECK (chat_type IN ('digital_twin', 'tutor', 'learning'));

-- Extender resources con categoría link
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_resource_type_check;
-- resource_type is TEXT without check in 001, add category column
ALTER TABLE resources ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- RLS
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychometric_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_risk_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_profiles_own ON student_profiles FOR ALL
  USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY student_profiles_institutional ON student_profiles FOR SELECT
  USING (
    is_any_admin() OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid()
        AND u.role IN ('area_head','dean','vice_president','rector','admin','platform_admin')
        AND u.institution_id = (SELECT institution_id FROM users WHERE id = student_profiles.user_id)
    )
  );

CREATE POLICY psychometric_own ON psychometric_assessments FOR ALL
  USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY twin_own ON digital_twin_profiles FOR ALL
  USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY twin_institutional ON digital_twin_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.user_id = digital_twin_profiles.user_id AND sp.twin_consent = TRUE
    )
    AND EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid()
        AND u.role IN ('area_head','dean','vice_president','rector','admin','platform_admin')
        AND u.institution_id = (SELECT institution_id FROM users WHERE id = digital_twin_profiles.user_id)
    )
  );

CREATE POLICY opportunities_select ON opportunities FOR SELECT
  USING (is_approved_user() AND is_active = TRUE);

CREATE POLICY opportunities_admin ON opportunities FOR ALL
  USING (is_any_admin());

CREATE POLICY saved_opportunities_own ON saved_opportunities FOR ALL
  USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY support_requests_own ON support_requests FOR ALL
  USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY support_requests_staff ON support_requests FOR SELECT
  USING (is_any_admin());

CREATE POLICY mood_own ON mood_checkins FOR ALL
  USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY risk_institutional ON student_risk_reports FOR SELECT
  USING (
    is_any_admin() OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid()
        AND u.role IN ('area_head','dean','vice_president','rector','admin','platform_admin')
        AND u.institution_id = student_risk_reports.institution_id
    )
  );

CREATE POLICY interventions_institutional ON interventions FOR ALL
  USING (
    is_any_admin() OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid()
        AND u.role IN ('area_head','dean','vice_president','rector','admin','platform_admin')
        AND u.institution_id = interventions.institution_id
    )
  );
