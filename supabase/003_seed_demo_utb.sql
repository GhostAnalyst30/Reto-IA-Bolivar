-- 003_seed_demo_utb.sql — Perfiles demo @utb.demo
-- Ejecutar DESPUÉS de crear usuarios en Auth (paso 4)
--
-- Opción A (recomendada): desde la raíz del repo
--   SEED_DEMO_PASSWORD=Demo2026! npx tsx scripts/seed-utb-users.ts
--
-- Opción B: crear manualmente en Supabase → Authentication → Users
--   y luego ejecutar solo los UPDATE de abajo.
--
-- Contraseña por defecto: Demo2026! (o SEED_DEMO_PASSWORD en .env)
--
-- Cuentas:
--   admin@utb.demo              → admin
--   rector@utb.demo             → rector
--   vicerrector@utb.demo        → vice_president
--   decano@utb.demo             → dean
--   director.programa@utb.demo  → area_head
--   estudiante01@utb.demo … estudiante10@utb.demo → student

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

-- Verificación
SELECT email, role, status, institution_id IS NOT NULL AS tiene_institucion
FROM public.users
WHERE email LIKE '%@utb.demo'
ORDER BY email;
