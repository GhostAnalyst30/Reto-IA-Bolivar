-- 020_utb_programs_catalog.sql
-- Catálogo completo de pregrados UTB (fuente oficial utb.edu.co)
-- Idempotente: seguro re-ejecutar en DBs ya sembradas.

-- ─── Escuelas (facultades) ───────────────────────────────────────────────────

INSERT INTO faculties (id, institution_id, name, slug) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Escuela de Ingeniería, Arquitectura & Diseño', 'ingenieria-arquitectura-diseno'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Escuela de Negocios, Leyes y Sociedad', 'negocios-leyes-sociedad'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Escuela de Transformación Digital', 'transformacion-digital')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  institution_id = EXCLUDED.institution_id;

-- Si quedó la facultad antigua "ciencias" con otro id/slug, no se toca; los IDs fijos UTB quedan alineados.

-- ─── Rename programa corto → nombre oficial ──────────────────────────────────

UPDATE academic_programs
SET
  name = 'Ingeniería de Sistemas y Computación',
  description = 'Escuela de Transformación Digital',
  faculty_id = 'b0000000-0000-4000-8000-000000000003',
  is_active = TRUE
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001'
  AND name = 'Ingeniería de Sistemas'
  AND NOT EXISTS (
    SELECT 1 FROM academic_programs
    WHERE institution_id = 'a0000000-0000-4000-8000-000000000001'
      AND name = 'Ingeniería de Sistemas y Computación'
  );

-- Si ya existía el nombre oficial, desactiva el corto para evitar duplicados en catálogo
UPDATE academic_programs
SET is_active = FALSE
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001'
  AND name = 'Ingeniería de Sistemas'
  AND EXISTS (
    SELECT 1 FROM academic_programs
    WHERE institution_id = 'a0000000-0000-4000-8000-000000000001'
      AND name = 'Ingeniería de Sistemas y Computación'
  );

-- Actualizar faculty/description de programas seed previos que ya existen
UPDATE academic_programs
SET
  description = 'Escuela de Ingeniería, Arquitectura & Diseño',
  faculty_id = 'b0000000-0000-4000-8000-000000000001',
  is_active = TRUE
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001'
  AND name = 'Ingeniería Industrial';

UPDATE academic_programs
SET
  description = 'Escuela de Negocios, Leyes y Sociedad',
  faculty_id = 'b0000000-0000-4000-8000-000000000002',
  is_active = TRUE
WHERE institution_id = 'a0000000-0000-4000-8000-000000000001'
  AND name = 'Administración de Empresas';

-- ─── Insertar pregrados faltantes ────────────────────────────────────────────

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

-- Alinear description/faculty/is_active en los que ya existían
UPDATE academic_programs p
SET
  description = v.description,
  faculty_id = v.faculty_id,
  is_active = TRUE
FROM (VALUES
  ('Arquitectura', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('Diseño', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('Ingeniería Ambiental', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('Ingeniería Biomédica', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('Ingeniería Civil', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('Ingeniería Eléctrica', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('Ingeniería Electrónica', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('Ingeniería Industrial', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('Ingeniería Mecánica', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('Ingeniería Mecatrónica', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('Ingeniería Naval', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('Ingeniería Química', 'Escuela de Ingeniería, Arquitectura & Diseño', 'b0000000-0000-4000-8000-000000000001'::uuid),
  ('Ciencia de Datos', 'Escuela de Transformación Digital', 'b0000000-0000-4000-8000-000000000003'::uuid),
  ('Comunicación Social', 'Escuela de Transformación Digital', 'b0000000-0000-4000-8000-000000000003'::uuid),
  ('Ingeniería de Sistemas y Computación', 'Escuela de Transformación Digital', 'b0000000-0000-4000-8000-000000000003'::uuid),
  ('Marketing y Transformación Digital', 'Escuela de Transformación Digital', 'b0000000-0000-4000-8000-000000000003'::uuid),
  ('Administración de Empresas', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('Ciencia Política y Relaciones Internacionales', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('Contaduría Pública', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('Contaduría Pública (Modalidad virtual)', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('Derecho', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('Economía', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('Finanzas y Negocios Internacionales', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid),
  ('Psicología', 'Escuela de Negocios, Leyes y Sociedad', 'b0000000-0000-4000-8000-000000000002'::uuid)
) AS v(name, description, faculty_id)
WHERE p.institution_id = 'a0000000-0000-4000-8000-000000000001'
  AND p.name = v.name;
