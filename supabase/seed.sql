-- Seed demo data (run after migrations, with auth users created separately)
-- Institution
INSERT INTO institutions (id, name, slug) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Universidad Bolívar Demo', 'uni-bolivar-demo')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO faculties (id, institution_id, name, slug) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Facultad de Ingeniería', 'ingenieria'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Facultad de Ciencias', 'ciencias')
ON CONFLICT DO NOTHING;

-- Demo resources (20)
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
  ('c0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000001', 'Investigación Científica', 'Método científico y paper writing', 'https://example.com/research', 'investigacion', 'article')
ON CONFLICT DO NOTHING;

-- Resource embeddings (text chunks for RAG demo)
INSERT INTO resource_embeddings (resource_id, chunk_text) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'El álgebra lineal estudia vectores, matrices y transformaciones lineales. Es fundamental en machine learning.'),
  ('c0000000-0000-4000-8000-000000000003', 'Python es un lenguaje interpretado ideal para data science. Usa listas, diccionarios y funciones lambda.'),
  ('c0000000-0000-4000-8000-000000000005', 'Machine learning supervisado usa datos etiquetados para entrenar modelos de clasificación y regresión.'),
  ('c0000000-0000-4000-8000-000000000009', 'SQL permite consultar bases relacionales con SELECT, JOIN, GROUP BY e índices para optimización.'),
  ('c0000000-0000-4000-8000-000000000017', 'OWASP Top 10 incluye broken access control, injection, cryptographic failures y security misconfiguration.')
ON CONFLICT DO NOTHING;

-- Institutional KPIs demo
INSERT INTO institutional_kpis (institution_id, metric_name, metric_value, metric_unit, period) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'retention_rate', 87.5, 'percent', '2025-S2'),
  ('a0000000-0000-4000-8000-000000000001', 'graduation_rate', 72.3, 'percent', '2025'),
  ('a0000000-0000-4000-8000-000000000001', 'student_satisfaction', 4.2, 'score_5', '2025-S2'),
  ('a0000000-0000-4000-8000-000000000001', 'research_output', 156, 'papers', '2025'),
  ('a0000000-0000-4000-8000-000000000001', 'enrollment', 12450, 'students', '2025-S2'),
  ('a0000000-0000-4000-8000-000000000001', 'budget_execution', 94.8, 'percent', '2025')
ON CONFLICT DO NOTHING;

-- Auth key demo: plaintext "DEMO-DEAN-2026" — bcrypt hash below (cost 12)
-- Generate via API in production; this is for staging reference
INSERT INTO role_auth_keys (id, institution_id, role, key_hash, label, max_uses, expires_at) VALUES
  ('d0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001',
   'dean',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oQKLMN9pR8.m',
   'Clave decanato demo 2026',
   10,
   '2027-12-31'::timestamptz),
  ('d0000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000001',
   'rector',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oQKLMN9pR8.m',
   'Clave rectorado demo 2026',
   5,
   '2027-12-31'::timestamptz)
ON CONFLICT DO NOTHING;

-- Note: Demo auth users must be created via Supabase Auth dashboard or API:
-- estudiante@demo.uni / Demo2026! (student, approved)
-- decano@demo.uni / Demo2026! (dean, approved)
-- rector@demo.uni / Demo2026! (rector, approved)
-- admin@demo.uni / Demo2026! (admin, approved)
-- pending@demo.uni / Demo2026! (student, pending) — for admin panel testing
