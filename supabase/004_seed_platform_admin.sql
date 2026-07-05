-- 004_seed_platform_admin.sql — Perfil platform admin
-- Ejecutar DESPUÉS de crear el usuario en Auth:
--   SEED_DEMO_PASSWORD=Immanuel3008 npx tsx scripts/seed-platform-admin.ts
--
-- Cuenta: username admin · ascendraemmanuel@gmail.com (rol platform_admin)

UPDATE public.users SET
  role = 'platform_admin',
  status = 'approved',
  institution_id = NULL,
  username = 'admin',
  full_name = 'Administrador UTB Te acompaña'
WHERE email = 'ascendraemmanuel@gmail.com'
   OR username = 'admin';

SELECT username, email, role, status, institution_id
FROM public.users
WHERE username = 'admin' OR email = 'ascendraemmanuel@gmail.com';
