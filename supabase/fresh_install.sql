-- =============================================================================
-- fresh_install.sql — Instalación completa desde cero (Reto IA Bolívar)
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor (como postgres / rol con acceso a auth).
--
-- Incluye:
--   1. Limpieza del esquema public del proyecto
--   2. Tablas, funciones, triggers y políticas RLS (001–004)
--   3. Datos demo (institución, recursos, KPIs, claves de rol)
--   4. Usuarios Auth demo + perfiles en public.users
--
-- Credenciales demo (password para todos): Demo2026!
--
-- | Email                 | Rol     | Estado   | Portal              |
-- |-----------------------|---------|----------|---------------------|
-- | admin@demo.uni        | admin   | approved | /institutional/admin|
-- | estudiante@demo.uni   | student | approved | /student/chat       |
-- | decano@demo.uni       | dean    | approved | /institutional      |
-- | rector@demo.uni       | rector  | approved | /institutional      |
-- | pending@demo.uni      | student | pending  | (panel admin)       |
--
-- Claves institucionales demo (plaintext): DEMO-DEAN-2026
-- =============================================================================

-- =============================================================================
-- PARTE 1 — RESET del esquema public
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS resources_search_vector_update ON public.resources;

DROP TABLE IF EXISTS public.registration_requests CASCADE;
DROP TABLE IF EXISTS public.role_auth_keys CASCADE;
DROP TABLE IF EXISTS public.student_progress CASCADE;
DROP TABLE IF EXISTS public.learning_path_steps CASCADE;
DROP TABLE IF EXISTS public.learning_paths CASCADE;
DROP TABLE IF EXISTS public.saved_resources CASCADE;
DROP TABLE IF EXISTS public.security_events CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.resource_embeddings CASCADE;
DROP TABLE IF EXISTS public.institutional_kpis CASCADE;
DROP TABLE IF EXISTS public.resources CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.faculties CASCADE;
DROP TABLE IF EXISTS public.institutions CASCADE;

DROP FUNCTION IF EXISTS public.match_embeddings(vector, integer);
DROP FUNCTION IF EXISTS public.search_resources_text(text, integer);
DROP FUNCTION IF EXISTS public.update_resource_search_vector();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_approved_user();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public._bootstrap_demo_auth_user(uuid, text, text, text);

-- =============================================================================
-- PARTE 2 — ESQUEMA (001_schema + 002 + 003 + 004)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --- 001_schema ---

CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE(institution_id, slug)
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN (
    'student', 'area_head', 'dean', 'vice_president', 'rector', 'admin'
  )),
  institution_id UUID REFERENCES institutions(id),
  faculty_id UUID REFERENCES faculties(id),
  area_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  topic TEXT,
  resource_type TEXT DEFAULT 'article',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resources_search ON resources USING GIN(search_vector);

CREATE TABLE resource_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Nueva conversación',
  context_resource_id UUID REFERENCES resources(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE institutional_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  period TEXT,
  faculty_id UUID REFERENCES faculties(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10
)
RETURNS TABLE (id UUID, resource_id UUID, chunk_text TEXT, similarity FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT re.id, re.resource_id, re.chunk_text,
         1 - (re.embedding <=> query_embedding) AS similarity
  FROM resource_embeddings re
  WHERE re.embedding IS NOT NULL
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION search_resources_text(search_query TEXT, match_count INT DEFAULT 20)
RETURNS TABLE (id UUID, title TEXT, description TEXT, topic TEXT, rank REAL)
LANGUAGE sql STABLE AS $$
  SELECT r.id, r.title, r.description, r.topic,
         ts_rank(r.search_vector, plainto_tsquery('spanish', search_query)) AS rank
  FROM resources r
  WHERE r.search_vector @@ plainto_tsquery('spanish', search_query)
  ORDER BY rank DESC
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION update_resource_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish',
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.topic, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_search_vector_update
  BEFORE INSERT OR UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_resource_search_vector();

-- --- 002_security_sessions ---

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_label TEXT,
  portal TEXT CHECK (portal IN ('student', 'institutional')),
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id)
);

CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE saved_resources (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, resource_id)
);

CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE learning_path_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  title TEXT NOT NULL,
  resource_id UUID REFERENCES resources(id),
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(path_id, step_order)
);

CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutional_kpis ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_approved_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY users_select_own ON users FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY resources_select ON resources FOR SELECT USING (is_approved_user());

CREATE POLICY chats_all ON chats FOR ALL USING (user_id = auth.uid() AND is_approved_user());
CREATE POLICY messages_all ON messages FOR ALL USING (
  EXISTS (SELECT 1 FROM chats c WHERE c.id = chat_id AND c.user_id = auth.uid()) AND is_approved_user()
);

CREATE POLICY saved_resources_all ON saved_resources FOR ALL USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY learning_paths_all ON learning_paths FOR ALL USING (user_id = auth.uid() AND is_approved_user());
CREATE POLICY learning_path_steps_all ON learning_path_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM learning_paths lp WHERE lp.id = path_id AND lp.user_id = auth.uid()) AND is_approved_user()
);

CREATE POLICY student_progress_all ON student_progress FOR ALL USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY kpis_institutional ON institutional_kpis FOR SELECT USING (
  is_approved_user() AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role != 'student'
  )
);

CREATE POLICY security_events_admin ON security_events FOR SELECT USING (is_admin());

CREATE POLICY sessions_own ON user_sessions FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY sessions_admin ON user_sessions FOR UPDATE USING (is_admin());

CREATE INDEX idx_security_events_created ON security_events(created_at DESC);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id) WHERE is_active = TRUE;

-- --- 003_onboarding ---

CREATE TABLE role_auth_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('area_head', 'dean', 'vice_president', 'rector')),
  key_hash TEXT NOT NULL,
  label TEXT,
  max_uses INT DEFAULT 1,
  uses_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  requested_role TEXT NOT NULL CHECK (requested_role IN (
    'student', 'area_head', 'dean', 'vice_president', 'rector'
  )),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  auth_key_id UUID REFERENCES role_auth_keys(id),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX idx_registration_requests_status ON registration_requests(status) WHERE status = 'pending';
CREATE INDEX idx_role_auth_keys_institution_role ON role_auth_keys(institution_id, role) WHERE revoked_at IS NULL;

ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_auth_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY institutions_public_read ON institutions FOR SELECT USING (is_active = TRUE);
CREATE POLICY reg_req_own ON registration_requests FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY reg_req_insert ON registration_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY auth_keys_admin ON role_auth_keys FOR ALL USING (is_admin());
CREATE POLICY institutions_auth_read ON institutions FOR SELECT TO authenticated USING (is_active = TRUE);

-- --- 004_rls_fixes ---

DROP POLICY IF EXISTS kpis_institutional ON institutional_kpis;
CREATE POLICY kpis_institutional ON institutional_kpis FOR SELECT USING (
  is_approved_user() AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.role != 'student'
      AND u.institution_id = institutional_kpis.institution_id
  )
);

ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
CREATE POLICY faculties_read ON faculties FOR SELECT USING (
  is_approved_user() AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.institution_id = faculties.institution_id
  )
);

DROP POLICY IF EXISTS resources_select ON resources;
CREATE POLICY resources_select ON resources FOR SELECT USING (
  is_approved_user() AND (
    institution_id IS NULL
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.institution_id IS NULL OR u.institution_id = resources.institution_id)
    )
  )
);

DROP POLICY IF EXISTS reg_req_insert ON registration_requests;
CREATE POLICY reg_req_insert ON registration_requests FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND requested_role = 'student'
);

-- =============================================================================
-- PARTE 3 — SEED (datos demo)
-- =============================================================================

INSERT INTO institutions (id, name, slug) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Universidad Bolívar Demo', 'uni-bolivar-demo');

INSERT INTO faculties (id, institution_id, name, slug) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Facultad de Ingeniería', 'ingenieria'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Facultad de Ciencias', 'ciencias');

INSERT INTO resources (id, institution_id, title, description, url, topic, resource_type) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Introducción al Álgebra Lineal', 'Conceptos fundamentales de vectores y matrices', 'https://example.com/algebra', 'matematicas', 'article'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Cálculo Diferencial', 'Límites, derivadas y aplicaciones', 'https://example.com/calculo', 'matematicas', 'article'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Programación en Python', 'Fundamentos de Python para ciencia de datos', 'https://example.com/python', 'programacion', 'course'),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Estructuras de Datos', 'Arrays, listas, árboles y grafos', 'https://example.com/estructuras', 'programacion', 'article'),
  ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Machine Learning Básico', 'Introducción a modelos supervisados', 'https://example.com/ml', 'inteligencia_artificial', 'course'),
  ('c0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'Redes Neuronales', 'Perceptrón y backpropagation', 'https://example.com/nn', 'inteligencia_artificial', 'article'),
  ('c0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'Estadística Descriptiva', 'Medidas de tendencia central y dispersión', 'https://example.com/stats', 'estadistica', 'article'),
  ('c0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'Probabilidad', 'Eventos, distribuciones y teorema de Bayes', 'https://example.com/prob', 'estadistica', 'article'),
  ('c0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'Bases de Datos SQL', 'Consultas, joins e índices', 'https://example.com/sql', 'bases_datos', 'course'),
  ('c0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 'Diseño de APIs REST', 'Principios RESTful y OpenAPI', 'https://example.com/rest', 'programacion', 'article'),
  ('c0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'Física Mecánica', 'Cinemática y dinámica clásica', 'https://example.com/fisica', 'fisica', 'article'),
  ('c0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'Química Orgánica', 'Enlaces carbono e hidrocarburos', 'https://example.com/quimica', 'quimica', 'article'),
  ('c0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'Historia de Colombia', 'Independencia y república', 'https://example.com/historia', 'historia', 'article'),
  ('c0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001', 'Economía Micro', 'Oferta, demanda y equilibrio', 'https://example.com/economia', 'economia', 'article'),
  ('c0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000001', 'Ética Profesional', 'Deontología y responsabilidad social', 'https://example.com/etica', 'humanidades', 'article'),
  ('c0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000001', 'Inglés Académico', 'Reading and writing skills', 'https://example.com/english', 'idiomas', 'course'),
  ('c0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000001', 'Ciberseguridad OWASP', 'Top 10 vulnerabilidades web', 'https://example.com/owasp', 'seguridad', 'article'),
  ('c0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000001', 'Cloud Computing AWS', 'Servicios core de AWS', 'https://example.com/aws', 'cloud', 'course'),
  ('c0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000001', 'Gestión de Proyectos', 'Metodologías ágiles Scrum', 'https://example.com/scrum', 'gestion', 'article'),
  ('c0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000001', 'Investigación Científica', 'Método científico y paper writing', 'https://example.com/research', 'investigacion', 'article');

INSERT INTO resource_embeddings (resource_id, chunk_text) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'El álgebra lineal estudia vectores, matrices y transformaciones lineales. Es fundamental en machine learning.'),
  ('c0000000-0000-4000-8000-000000000003', 'Python es un lenguaje interpretado ideal para data science. Usa listas, diccionarios y funciones lambda.'),
  ('c0000000-0000-4000-8000-000000000005', 'Machine learning supervisado usa datos etiquetados para entrenar modelos de clasificación y regresión.'),
  ('c0000000-0000-4000-8000-000000000009', 'SQL permite consultar bases relacionales con SELECT, JOIN, GROUP BY e índices para optimización.'),
  ('c0000000-0000-4000-8000-000000000017', 'OWASP Top 10 incluye broken access control, injection, cryptographic failures y security misconfiguration.');

INSERT INTO institutional_kpis (institution_id, metric_name, metric_value, metric_unit, period) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'retention_rate', 87.5, 'percent', '2025-S2'),
  ('a0000000-0000-4000-8000-000000000001', 'graduation_rate', 72.3, 'percent', '2025'),
  ('a0000000-0000-4000-8000-000000000001', 'student_satisfaction', 4.2, 'score_5', '2025-S2'),
  ('a0000000-0000-4000-8000-000000000001', 'research_output', 156, 'papers', '2025'),
  ('a0000000-0000-4000-8000-000000000001', 'enrollment', 12450, 'students', '2025-S2'),
  ('a0000000-0000-4000-8000-000000000001', 'budget_execution', 94.8, 'percent', '2025');

-- Clave demo plaintext: DEMO-DEAN-2026 (bcrypt cost 12)
INSERT INTO role_auth_keys (id, institution_id, role, key_hash, label, max_uses, expires_at) VALUES
  ('d0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001',
   'dean',
   '$2b$12$AOgrKJwzeXYdr1NxSiD.7uK0ZaKmQ2AppuY3Hh6LFV8jd9ZLU1GQ.',
   'Clave decanato demo 2026',
   10,
   '2027-12-31'::timestamptz),
  ('d0000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000001',
   'rector',
   '$2b$12$AOgrKJwzeXYdr1NxSiD.7uK0ZaKmQ2AppuY3Hh6LFV8jd9ZLU1GQ.',
   'Clave rectorado demo 2026',
   5,
   '2027-12-31'::timestamptz);

-- =============================================================================
-- PARTE 4 — USUARIOS AUTH DEMO
-- =============================================================================

-- Quitar usuarios demo previos (idempotente al re-ejecutar)
DELETE FROM auth.identities
WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@demo.uni');

DELETE FROM auth.users WHERE email LIKE '%@demo.uni';

CREATE OR REPLACE FUNCTION public._bootstrap_demo_auth_user(
  p_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    p_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    p_id,
    p_id,
    jsonb_build_object(
      'sub', p_id::text,
      'email', p_email,
      'email_verified', TRUE,
      'phone_verified', FALSE
    ),
    'email',
    p_id::text,
    NOW(),
    NOW(),
    NOW()
  );
END;
$$;

SELECT public._bootstrap_demo_auth_user(
  'e0000000-0000-4000-8000-000000000001',
  'admin@demo.uni',
  'Demo2026!',
  'Admin'
);

SELECT public._bootstrap_demo_auth_user(
  'e0000000-0000-4000-8000-000000000002',
  'estudiante@demo.uni',
  'Demo2026!',
  'Estudiante Demo'
);

SELECT public._bootstrap_demo_auth_user(
  'e0000000-0000-4000-8000-000000000003',
  'decano@demo.uni',
  'Demo2026!',
  'Decano Demo'
);

SELECT public._bootstrap_demo_auth_user(
  'e0000000-0000-4000-8000-000000000004',
  'rector@demo.uni',
  'Demo2026!',
  'Rector Demo'
);

SELECT public._bootstrap_demo_auth_user(
  'e0000000-0000-4000-8000-000000000005',
  'pending@demo.uni',
  'Demo2026!',
  'Pendiente Demo'
);

DROP FUNCTION public._bootstrap_demo_auth_user(uuid, text, text, text);

-- =============================================================================
-- PARTE 5 — PERFILES public.users (roles y aprobación)
-- =============================================================================

UPDATE public.users SET
  role = 'admin',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Admin'
WHERE email = 'admin@demo.uni';

UPDATE public.users SET
  role = 'student',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Estudiante Demo'
WHERE email = 'estudiante@demo.uni';

UPDATE public.users SET
  role = 'dean',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  faculty_id = 'b0000000-0000-4000-8000-000000000001',
  full_name = 'Decano Demo'
WHERE email = 'decano@demo.uni';

UPDATE public.users SET
  role = 'rector',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Rector Demo'
WHERE email = 'rector@demo.uni';

-- pending@demo.uni queda con status = 'pending' (creado por el trigger)

-- =============================================================================
-- VERIFICACIÓN (opcional)
-- =============================================================================

SELECT 'institutions' AS tabla, COUNT(*) AS total FROM public.institutions
UNION ALL SELECT 'resources', COUNT(*) FROM public.resources
UNION ALL SELECT 'role_auth_keys', COUNT(*) FROM public.role_auth_keys
UNION ALL SELECT 'auth_users_demo', COUNT(*) FROM auth.users WHERE email LIKE '%@demo.uni';

SELECT email, role, status, institution_id IS NOT NULL AS tiene_institucion
FROM public.users
WHERE email LIKE '%@demo.uni'
ORDER BY email;
