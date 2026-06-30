-- 002_rls_and_seed.sql — RLS, políticas e datos iniciales UTB
-- Ejecutar después de 001_schema.sql

-- ─── RLS helpers ────────────────────────────────────────────────────────────

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

-- ─── Enable RLS ─────────────────────────────────────────────────────────────

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
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_auth_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocational_assessments ENABLE ROW LEVEL SECURITY;

-- ─── Policies ─────────────────────────────────────────────────────────────

CREATE POLICY users_select_own ON users FOR SELECT USING (id = auth.uid() OR is_admin());

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

CREATE POLICY chats_all ON chats FOR ALL USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY messages_all ON messages FOR ALL USING (
  EXISTS (SELECT 1 FROM chats c WHERE c.id = chat_id AND c.user_id = auth.uid())
  AND is_approved_user()
);

CREATE POLICY saved_resources_all ON saved_resources FOR ALL USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY learning_paths_all ON learning_paths FOR ALL USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY learning_path_steps_all ON learning_path_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM learning_paths lp WHERE lp.id = path_id AND lp.user_id = auth.uid())
  AND is_approved_user()
);

CREATE POLICY student_progress_all ON student_progress FOR ALL USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY kpis_institutional ON institutional_kpis FOR SELECT USING (
  is_approved_user() AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.role != 'student'
      AND u.institution_id = institutional_kpis.institution_id
  )
);

CREATE POLICY security_events_admin ON security_events FOR SELECT USING (is_admin());

CREATE POLICY sessions_own ON user_sessions FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY sessions_admin ON user_sessions FOR UPDATE USING (is_admin());

CREATE POLICY institutions_public_read ON institutions FOR SELECT USING (is_active = TRUE);
CREATE POLICY institutions_auth_read ON institutions FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY reg_req_own ON registration_requests FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY reg_req_insert ON registration_requests FOR INSERT WITH CHECK (
  user_id = auth.uid() AND requested_role = 'student'
);

CREATE POLICY auth_keys_admin ON role_auth_keys FOR ALL USING (is_admin());

CREATE POLICY faculties_read ON faculties FOR SELECT USING (
  is_approved_user() AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.institution_id = faculties.institution_id
  )
);

CREATE POLICY programs_read ON academic_programs FOR SELECT USING (
  is_active = TRUE AND (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid() AND status = 'approved')
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY programs_admin ON academic_programs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin' AND institution_id = academic_programs.institution_id
  )
);

CREATE POLICY curricula_read ON program_curricula FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM academic_programs p
    JOIN users u ON u.institution_id = p.institution_id
    WHERE p.id = program_curricula.program_id AND u.id = auth.uid() AND u.status = 'approved'
  )
);

CREATE POLICY vocational_own ON vocational_assessments FOR ALL USING (user_id = auth.uid());

-- ─── Seed: UTB institution ──────────────────────────────────────────────────

INSERT INTO institutions (id, name, slug) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Universidad Tecnológica de Bolívar', 'utb')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO faculties (id, institution_id, name, slug) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Facultad de Ingeniería', 'ingenieria'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Facultad de Ciencias', 'ciencias')
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: recursos demo ────────────────────────────────────────────────────

INSERT INTO resources (id, institution_id, title, description, url, topic, resource_type) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Introducción al Álgebra Lineal', 'Conceptos fundamentales de vectores y matrices', 'https://www.khanacademy.org/math/linear-algebra', 'matematicas', 'article'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Cálculo Diferencial', 'Límites, derivadas y aplicaciones', 'https://www.khanacademy.org/math/calculus-1', 'matematicas', 'article'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Programación en Python', 'Fundamentos de Python para ciencia de datos', 'https://www.w3schools.com/python/', 'programacion', 'course'),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Estructuras de Datos', 'Arrays, listas, árboles y grafos', 'https://www.w3schools.com/python/python_lists.asp', 'programacion', 'article'),
  ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Machine Learning Básico', 'Introducción a modelos supervisados', 'https://www.youtube.com/results?search_query=machine+learning+basics', 'inteligencia_artificial', 'course'),
  ('c0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'Redes Neuronales', 'Perceptrón y backpropagation', 'https://www.youtube.com/results?search_query=neural+networks', 'inteligencia_artificial', 'article'),
  ('c0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'Estadística Descriptiva', 'Medidas de tendencia central y dispersión', 'https://www.khanacademy.org/math/statistics-probability', 'estadistica', 'article'),
  ('c0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'Probabilidad', 'Eventos, distribuciones y teorema de Bayes', 'https://www.khanacademy.org/math/statistics-probability/probability-library', 'estadistica', 'article'),
  ('c0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'Bases de Datos SQL', 'Consultas, joins e índices', 'https://www.w3schools.com/sql/', 'bases_datos', 'course'),
  ('c0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 'Diseño de APIs REST', 'Principios RESTful y OpenAPI', 'https://www.w3schools.com/tags/default.asp', 'programacion', 'article'),
  ('c0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'Física Mecánica', 'Cinemática y dinámica clásica', 'https://www.khanacademy.org/science/physics', 'fisica', 'article'),
  ('c0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'Química Orgánica', 'Enlaces carbono e hidrocarburos', 'https://www.khanacademy.org/science/organic-chemistry', 'quimica', 'article'),
  ('c0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'Historia de Colombia', 'Independencia y república', 'https://www.khanacademy.org/humanities/world-history', 'historia', 'article'),
  ('c0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001', 'Economía Micro', 'Oferta, demanda y equilibrio', 'https://www.khanacademy.org/economics-finance-domain', 'economia', 'article'),
  ('c0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000001', 'Ética Profesional', 'Deontología y responsabilidad social', 'https://www.edx.org/search?q=ethics', 'humanidades', 'article'),
  ('c0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000001', 'Inglés Académico', 'Reading and writing skills', 'https://www.edx.org/search?q=english', 'idiomas', 'course'),
  ('c0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000001', 'Ciberseguridad OWASP', 'Top 10 vulnerabilidades web', 'https://owasp.org/www-project-top-ten/', 'seguridad', 'article'),
  ('c0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000001', 'Cloud Computing AWS', 'Servicios core de AWS', 'https://www.edx.org/search?q=cloud+computing', 'cloud', 'course'),
  ('c0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000001', 'Gestión de Proyectos', 'Metodologías ágiles Scrum', 'https://www.edx.org/search?q=project+management', 'gestion', 'article'),
  ('c0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000001', 'Investigación Científica', 'Método científico y paper writing', 'https://www.edx.org/search?q=research+methods', 'investigacion', 'article')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_embeddings (resource_id, chunk_text) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'El álgebra lineal estudia vectores, matrices y transformaciones lineales. Es fundamental en machine learning.'),
  ('c0000000-0000-4000-8000-000000000003', 'Python es un lenguaje interpretado ideal para data science. Usa listas, diccionarios y funciones lambda.'),
  ('c0000000-0000-4000-8000-000000000005', 'Machine learning supervisado usa datos etiquetados para entrenar modelos de clasificación y regresión.'),
  ('c0000000-0000-4000-8000-000000000009', 'SQL permite consultar bases relacionales con SELECT, JOIN, GROUP BY e índices para optimización.'),
  ('c0000000-0000-4000-8000-000000000017', 'OWASP Top 10 incluye broken access control, injection, cryptographic failures y security misconfiguration.')
ON CONFLICT DO NOTHING;

-- ─── Seed: programas académicos UTB ─────────────────────────────────────────

INSERT INTO academic_programs (institution_id, name, description) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Ingeniería de Sistemas', 'Desarrollo de software, datos e IA'),
  ('a0000000-0000-4000-8000-000000000001', 'Ingeniería Industrial', 'Optimización de procesos y producción'),
  ('a0000000-0000-4000-8000-000000000001', 'Administración de Empresas', 'Gestión, finanzas y emprendimiento'),
  ('a0000000-0000-4000-8000-000000000001', 'Derecho', 'Ciencias jurídicas y derecho público'),
  ('a0000000-0000-4000-8000-000000000001', 'Psicología', 'Clínica, organizacional y educativa');

-- ─── Seed: claves de rol demo (plaintext: DEMO-DEAN-2026) ───────────────────

INSERT INTO role_auth_keys (id, institution_id, role, key_hash, label, max_uses, expires_at) VALUES
  ('d0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001',
   'dean',
   '$2b$12$AOgrKJwzeXYdr1NxSiD.7uK0ZaKmQ2AppuY3Hh6LFV8jd9ZLU1GQ.',
   'Clave decanato UTB 2026',
   10,
   '2027-12-31'::timestamptz),
  ('d0000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000001',
   'rector',
   '$2b$12$AOgrKJwzeXYdr1NxSiD.7uK0ZaKmQ2AppuY3Hh6LFV8jd9ZLU1GQ.',
   'Clave rectorado UTB 2026',
   5,
   '2027-12-31'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- KPIs seed opcionales (referencia; la analítica usa datos en vivo)
INSERT INTO institutional_kpis (institution_id, metric_name, metric_value, metric_unit, period) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'retention_rate', 87.5, 'percent', '2025-S2'),
  ('a0000000-0000-4000-8000-000000000001', 'graduation_rate', 72.3, 'percent', '2025'),
  ('a0000000-0000-4000-8000-000000000001', 'student_satisfaction', 4.2, 'score_5', '2025-S2');
