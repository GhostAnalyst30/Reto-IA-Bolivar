-- 005_seed_demo_utb.sql — Datos demo UTB (OPCIONAL)
-- Requiere usuarios demo creados con scripts/seed-utb-users.ts
-- Nota: los correos demo deben ser @utb.edu.co para cumplir la restricción de dominio.

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

-- Perfiles demo (emails @utb.edu.co recomendados en seed-utb-users.ts)
UPDATE public.users SET
  role = 'admin',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Admin UTB'
WHERE email = 'admin.demo@utb.edu.co';

UPDATE public.users SET
  role = 'rector',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Rector UTB'
WHERE email = 'rector.demo@utb.edu.co';

UPDATE public.users SET
  role = 'dean',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  faculty_id = 'b0000000-0000-4000-8000-000000000001',
  full_name = 'Decano UTB'
WHERE email = 'decano.demo@utb.edu.co';

UPDATE public.users SET
  role = 'vice_president',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Vicerrector UTB'
WHERE email = 'vicerrector.demo@utb.edu.co';

UPDATE public.users SET
  role = 'area_head',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  faculty_id = 'b0000000-0000-4000-8000-000000000001',
  full_name = 'Director de Programa UTB'
WHERE email = 'director.demo@utb.edu.co';

UPDATE public.users SET
  role = 'admin',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Lic. María Fernanda Ortiz'
WHERE email = 'psicologo.demo@utb.edu.co';

UPDATE public.users SET
  role = 'student',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = COALESCE(full_name, 'Estudiante Demo UTB')
WHERE email LIKE 'estudiante%.demo@utb.edu.co';
