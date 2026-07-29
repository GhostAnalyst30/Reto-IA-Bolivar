-- 021_program_domains_and_embeddings.sql
-- Tags de dominio explícitos por programa + tabla de embeddings precomputados.
-- Elimina el sesgo del heurístico de keywords (primer match gana) en program_matcher.py:
-- domain_tags es ahora la fuente de verdad para el vector de dominio de cada programa.
-- Idempotente: seguro re-ejecutar.

-- ─── domain_tags en academic_programs ────────────────────────────────────────
ALTER TABLE academic_programs
  ADD COLUMN IF NOT EXISTS domain_tags JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ─── Tabla de embeddings de programas ─────────────────────────────────────────
-- Dimensión 768 = Gemini text-embedding-004 (capa ligera de embeddings).
CREATE TABLE IF NOT EXISTS program_embeddings (
  program_id UUID PRIMARY KEY REFERENCES academic_programs(id) ON DELETE CASCADE,
  embedding VECTOR(768),
  model TEXT NOT NULL,
  embedded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sembrar domain_tags para los 24 pregrados UTB ───────────────────────────
-- Cada vector suma 1.0 (normalizado). Dominios: tech, industrial, engineering,
-- science, business, creative, society (alineados a vocational_questions.py).

UPDATE academic_programs SET domain_tags = '{"creative": 0.6, "engineering": 0.3, "industrial": 0.1}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Arquitectura';

UPDATE academic_programs SET domain_tags = '{"creative": 0.85, "business": 0.1, "tech": 0.05}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Diseño';

UPDATE academic_programs SET domain_tags = '{"science": 0.5, "engineering": 0.3, "industrial": 0.2}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ingeniería Ambiental';

UPDATE academic_programs SET domain_tags = '{"science": 0.5, "engineering": 0.4, "tech": 0.1}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ingeniería Biomédica';

UPDATE academic_programs SET domain_tags = '{"engineering": 0.8, "industrial": 0.15, "creative": 0.05}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ingeniería Civil';

UPDATE academic_programs SET domain_tags = '{"engineering": 0.85, "tech": 0.15}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ingeniería Eléctrica';

UPDATE academic_programs SET domain_tags = '{"engineering": 0.7, "tech": 0.3}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ingeniería Electrónica';

UPDATE academic_programs SET domain_tags = '{"industrial": 0.7, "engineering": 0.2, "business": 0.1}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ingeniería Industrial';

UPDATE academic_programs SET domain_tags = '{"engineering": 0.85, "industrial": 0.15}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ingeniería Mecánica';

UPDATE academic_programs SET domain_tags = '{"engineering": 0.6, "tech": 0.3, "industrial": 0.1}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ingeniería Mecatrónica';

UPDATE academic_programs SET domain_tags = '{"engineering": 0.85, "industrial": 0.15}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ingeniería Naval';

UPDATE academic_programs SET domain_tags = '{"science": 0.6, "industrial": 0.3, "engineering": 0.1}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ingeniería Química';

UPDATE academic_programs SET domain_tags = '{"tech": 0.6, "science": 0.3, "business": 0.1}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ciencia de Datos';

UPDATE academic_programs SET domain_tags = '{"creative": 0.7, "society": 0.25, "business": 0.05}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Comunicación Social';

UPDATE academic_programs SET domain_tags = '{"tech": 0.8, "engineering": 0.15, "science": 0.05}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ingeniería de Sistemas y Computación';

UPDATE academic_programs SET domain_tags = '{"business": 0.5, "creative": 0.3, "tech": 0.2}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Marketing y Transformación Digital';

UPDATE academic_programs SET domain_tags = '{"business": 0.85, "society": 0.1, "industrial": 0.05}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Administración de Empresas';

UPDATE academic_programs SET domain_tags = '{"society": 0.8, "business": 0.15, "creative": 0.05}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Ciencia Política y Relaciones Internacionales';

UPDATE academic_programs SET domain_tags = '{"business": 0.9, "society": 0.1}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Contaduría Pública';

UPDATE academic_programs SET domain_tags = '{"business": 0.9, "society": 0.1}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Contaduría Pública (Modalidad virtual)';

UPDATE academic_programs SET domain_tags = '{"society": 0.9, "business": 0.1}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Derecho';

UPDATE academic_programs SET domain_tags = '{"business": 0.7, "society": 0.25, "science": 0.05}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Economía';

UPDATE academic_programs SET domain_tags = '{"business": 0.85, "society": 0.1, "creative": 0.05}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Finanzas y Negocios Internacionales';

UPDATE academic_programs SET domain_tags = '{"society": 0.85, "science": 0.15}'::jsonb
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001' AND name = 'Psicología';

-- ─── Índice para similitud vectorial ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_program_embeddings_vector
  ON program_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 20);
