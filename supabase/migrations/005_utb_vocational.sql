-- UTB institution + vocational schema
UPDATE institutions SET
  name = 'Universidad Tecnológica de Bolívar',
  slug = 'utb'
WHERE id = 'a0000000-0000-4000-8000-000000000001';

CREATE TABLE IF NOT EXISTS academic_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  faculty_id UUID REFERENCES faculties(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS program_curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES academic_programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vocational_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  status TEXT CHECK (status IN ('in_progress', 'completed')) DEFAULT 'in_progress',
  answers JSONB DEFAULT '[]',
  suggested_program_ids UUID[] DEFAULT '{}',
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE resources ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;

ALTER TABLE academic_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocational_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY programs_read ON academic_programs FOR SELECT USING (
  is_active = TRUE AND (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid() AND status = 'approved')
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY programs_admin ON academic_programs FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND institution_id = academic_programs.institution_id)
);

CREATE POLICY curricula_read ON program_curricula FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM academic_programs p
    JOIN users u ON u.institution_id = p.institution_id
    WHERE p.id = program_curricula.program_id AND u.id = auth.uid() AND u.status = 'approved'
  )
);

CREATE POLICY vocational_own ON vocational_assessments FOR ALL USING (user_id = auth.uid());

-- Seed UTB programs
INSERT INTO academic_programs (institution_id, name, description) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Ingeniería de Sistemas', 'Desarrollo de software, datos e IA'),
  ('a0000000-0000-4000-8000-000000000001', 'Ingeniería Industrial', 'Optimización de procesos y producción'),
  ('a0000000-0000-4000-8000-000000000001', 'Administración de Empresas', 'Gestión, finanzas y emprendimiento'),
  ('a0000000-0000-4000-8000-000000000001', 'Derecho', 'Ciencias jurídicas y derecho público'),
  ('a0000000-0000-4000-8000-000000000001', 'Psicología', 'Clínica, organizacional y educativa')
ON CONFLICT DO NOTHING;
