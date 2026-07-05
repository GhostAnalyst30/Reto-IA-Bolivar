-- 006_seed_accompaniment_utb.sql — Seed oportunidades, videos, links demo
-- Requiere 003_seed_utb.sql (institución UTB). No depende de usuarios.

-- Oportunidades demo UTB
INSERT INTO opportunities (id, institution_id, type, title, description, requirements, area, tags, deadline, external_url) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'beca', 'Beca Excelencia Académica UTB', 'Apoyo económico para estudiantes con promedio superior a 4.0', ARRAY['Promedio >= 4.0', 'Matrícula activa'], 'general', ARRAY['merito','economico'], '2026-08-15', 'https://www.utb.edu.co'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'beca', 'Beca Bienestar Estudiantil', 'Apoyo para estudiantes en situación de vulnerabilidad socioeconómica', ARRAY['Formulario F-200', 'Entrevista bienestar'], 'bienestar', ARRAY['socioeconomico'], '2026-07-30', 'https://www.utb.edu.co'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'convocatoria', 'Monitoría Ingeniería de Sistemas', 'Convocatoria para monitores de programación y bases de datos', ARRAY['Semestre >= 6', 'Promedio >= 3.8'], 'ingenieria', ARRAY['monitoria','sistemas'], '2026-06-20', 'https://www.utb.edu.co'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'convocatoria', 'Práctica Profesional Empresas Aliadas', 'Vinculación con empresas del sector tecnológico en Cartagena', ARRAY['Créditos >= 80%'], 'ingenieria', ARRAY['practica','tecnologia'], '2026-09-01', 'https://www.utb.edu.co'),
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'evento', 'Feria de Emprendimiento UTB', 'Exposición de proyectos estudiantiles y networking con mentores', ARRAY['Inscripción gratuita'], 'emprendimiento', ARRAY['networking','evento'], '2026-05-25', 'https://www.utb.edu.co'),
  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'evento', 'Semana del Bienestar Estudiantil', 'Talleres de manejo de estrés, mindfulness y orientación psicológica', ARRAY['Matrícula activa'], 'bienestar', ARRAY['salud mental','taller'], '2026-04-10', 'https://www.utb.edu.co'),
  ('e0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'beca', 'Beca Colfuturo', 'Financiación para estudios de posgrado en el exterior', ARRAY['Graduado reciente', 'TOEFL/IELTS'], 'posgrado', ARRAY['internacional'], '2026-11-01', 'https://www.colfuturo.org'),
  ('e0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'convocatoria', 'Hackathon UTB 2026', 'Competencia de desarrollo de software con premios', ARRAY['Equipo de 3-5 integrantes'], 'tecnologia', ARRAY['hackathon','programacion'], '2026-06-01', 'https://www.utb.edu.co')
ON CONFLICT (id) DO NOTHING;

-- Recursos YouTube y links
INSERT INTO resources (id, institution_id, title, description, url, topic, resource_type, category) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Bienvenida UTB — Orientación estudiantil', 'Video de orientación para nuevos estudiantes', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'orientacion', 'youtube', 'orientacion'),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Técnicas de estudio efectivas', 'Sesión con docentes sobre métodos de aprendizaje', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'aprendizaje', 'youtube', 'academico'),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Manejo del estrés universitario', 'Podcast bienestar estudiantil UTB', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'bienestar', 'youtube', 'bienestar'),
  ('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Biblioteca Virtual UTB', 'Acceso a bases de datos académicas', 'https://www.utb.edu.co', 'biblioteca', 'link', 'biblioteca'),
  ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Bienestar Psicológico UTB', 'Servicios de apoyo psicológico institucional', 'https://www.utb.edu.co', 'bienestar', 'link', 'bienestar'),
  ('f0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'Reglamento Estudiantil', 'Normas y derechos del estudiante UTB', 'https://www.utb.edu.co', 'normativa', 'link', 'normativa'),
  ('f0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'Ejercicios de respiración guiada', 'Recurso de autoayuda para ansiedad', 'https://www.utb.edu.co', 'bienestar', 'article', 'autoayuda'),
  ('f0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'Portal de empleabilidad UTB', 'Ofertas laborales y ferias de empleo', 'https://www.utb.edu.co', 'empleo', 'link', 'empleo')
ON CONFLICT (id) DO NOTHING;
