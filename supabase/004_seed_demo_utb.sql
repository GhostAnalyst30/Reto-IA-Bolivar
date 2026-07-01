-- 004_seed_demo_utb.sql — Datos demo UTB (OPCIONAL)
-- Ejecutar solo después de crear la institución UTB desde el panel platform admin
-- o insertar manualmente la institución con el UUID de abajo.
--
-- Paso 1: npx tsx scripts/seed-utb-users.ts (crea Auth + perfiles)
-- Paso 2: ejecutar este SQL para recursos, programas y claves demo

INSERT INTO institutions (id, name, slug) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Universidad Tecnológica de Bolívar', 'utb')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO faculties (id, institution_id, name, slug) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Facultad de Ingeniería', 'ingenieria'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Facultad de Ciencias', 'ciencias')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resources (id, institution_id, title, description, url, topic, resource_type) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Introducción al Álgebra Lineal', 'Conceptos fundamentales de vectores y matrices', 'https://www.khanacademy.org/math/linear-algebra', 'matematicas', 'article'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Cálculo Diferencial', 'Límites, derivadas y aplicaciones', 'https://www.khanacademy.org/math/calculus-1', 'matematicas', 'article'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Programación en Python', 'Fundamentos de Python para ciencia de datos', 'https://www.w3schools.com/python/', 'programacion', 'course'),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Estructuras de Datos', 'Arrays, listas, árboles y grafos', 'https://www.w3schools.com/python/python_lists.asp', 'programacion', 'article'),
  ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Machine Learning Básico', 'Introducción a modelos supervisados', 'https://www.youtube.com/results?search_query=machine+learning+basics', 'inteligencia_artificial', 'course')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resource_embeddings (resource_id, chunk_text) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'El álgebra lineal estudia vectores, matrices y transformaciones lineales.'),
  ('c0000000-0000-4000-8000-000000000003', 'Python es un lenguaje interpretado ideal para data science.'),
  ('c0000000-0000-4000-8000-000000000005', 'Machine learning supervisado usa datos etiquetados para entrenar modelos.')
ON CONFLICT DO NOTHING;

INSERT INTO academic_programs (institution_id, name, description) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Ingeniería de Sistemas', 'Desarrollo de software, datos e IA'),
  ('a0000000-0000-4000-8000-000000000001', 'Ingeniería Industrial', 'Optimización de procesos y producción'),
  ('a0000000-0000-4000-8000-000000000001', 'Administración de Empresas', 'Gestión, finanzas y emprendimiento')
ON CONFLICT DO NOTHING;

-- Clave demo plaintext: DEMO-DEAN-2026
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

INSERT INTO institutional_kpis (institution_id, metric_name, metric_value, metric_unit, period) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'retention_rate', 87.5, 'percent', '2025-S2'),
  ('a0000000-0000-4000-8000-000000000001', 'graduation_rate', 72.3, 'percent', '2025'),
  ('a0000000-0000-4000-8000-000000000001', 'student_satisfaction', 4.2, 'score_5', '2025-S2');

-- Perfiles demo @utb.demo (tras seed-utb-users.ts)
UPDATE public.users SET
  role = 'admin',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Admin UTB'
WHERE email = 'admin@utb.demo';

UPDATE public.users SET
  role = 'rector',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Rector UTB'
WHERE email = 'rector@utb.demo';

UPDATE public.users SET
  role = 'vice_president',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Vicerrector UTB'
WHERE email = 'vicerrector@utb.demo';

UPDATE public.users SET
  role = 'dean',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  faculty_id = 'b0000000-0000-4000-8000-000000000001',
  full_name = 'Decano UTB'
WHERE email = 'decano@utb.demo';

UPDATE public.users SET
  role = 'area_head',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  faculty_id = 'b0000000-0000-4000-8000-000000000001',
  full_name = 'Director de Programa UTB'
WHERE email = 'director.programa@utb.demo';

UPDATE public.users SET
  role = 'student',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = COALESCE(full_name, 'Estudiante Demo UTB')
WHERE email LIKE 'estudiante%@utb.demo';
