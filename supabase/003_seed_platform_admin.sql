-- 003_seed_platform_admin.sql — Perfil platform admin
-- Ejecutar DESPUÉS de crear el usuario en Auth:
--   npx tsx scripts/seed-platform-admin.ts
--
-- Cuenta: admin@bolivar.ia.com (rol platform_admin, sin institución)
-- Correo de reportes reales: ascendraemmanuel@gmail.com (configurado en env)

UPDATE public.users SET
  role = 'platform_admin',
  status = 'approved',
  institution_id = NULL,
  full_name = 'Administrador Bolívar IA'
WHERE email = 'admin@bolivar.ia.com';

SELECT email, role, status, institution_id
FROM public.users
WHERE email = 'admin@bolivar.ia.com';
