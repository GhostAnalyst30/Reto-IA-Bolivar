-- 003_seed_utb.sql — Institución UTB (requerido)
-- Ejecutar después de 002_rls.sql

INSERT INTO institutions (id, name, slug) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Universidad Tecnológica de Bolívar', 'utb')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- Escuelas oficiales UTB (pregrado)
INSERT INTO faculties (id, institution_id, name, slug) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Escuela de Ingeniería, Arquitectura & Diseño', 'ingenieria-arquitectura-diseno'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Escuela de Negocios, Leyes y Sociedad', 'negocios-leyes-sociedad'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Escuela de Transformación Digital', 'transformacion-digital')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  institution_id = EXCLUDED.institution_id;

-- Pregrados oficiales UTB (fuente: utb.edu.co) — idempotente por nombre
INSERT INTO academic_programs (institution_id, name, description, faculty_id)
SELECT v.institution_id, v.name, v.description, v.faculty_id
FROM (VALUES
  -- Escuela de Ingeniería, Arquitectura & Diseño
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Arquitectura', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Diseño', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ingeniería Ambiental', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ingeniería Biomédica', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ingeniería Civil', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ingeniería Eléctrica', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ingeniería Electrónica', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ingeniería Industrial', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ingeniería Mecánica', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ingeniería Mecatrónica', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ingeniería Naval', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ingeniería Química', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  -- Escuela de Transformación Digital
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ciencia de Datos', 'Escuela de Transformación Digital', 'b0000000-0000-4000-8000-000000000003'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Comunicación Social', 'Escuela de Transformación Digital', 'b0000000-0000-4000-8000-000000000003'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ingeniería de Sistemas y Computación', 'Escuela de Transformación Digital', 'b0000000-0000-4000-8000-000000000003'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Marketing y Transformación Digital', 'Escuela de Transformación Digital', 'b0000000-0000-4000-8000-000000000003'::uuid),
  -- Escuela de Negocios, Leyes y Sociedad
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Administración de Empresas', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Ciencia Política y Relaciones Internacionales', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Contaduría Pública', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Contaduría Pública (Modalidad virtual)', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Derecho', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Economía', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Finanzas y Negocios Internacionales', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Psicología', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid)
) AS v(institution_id, name, description, faculty_id)
WHERE NOT EXISTS (
  SELECT 1 FROM academic_programs p
  WHERE p.institution_id = v.institution_id AND p.name = v.name
);

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

INSERT INTO institutional_kpis (institution_id, metric_name, metric_value, metric_unit, period) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'retention_rate', 87.5, 'percent', '2025-S2'),
  ('a0000000-0000-4000-8000-000000000001', 'graduation_rate', 72.3, 'percent', '2025'),
  ('a0000000-0000-4000-8000-000000000001', 'student_satisfaction', 4.2, 'score_5', '2025-S2');
