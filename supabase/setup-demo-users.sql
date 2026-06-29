-- Ejecutar DESPUÉS de crear usuarios en Supabase Auth (Authentication → Users)
-- Password sugerida: Demo2026! o la de tu .env.local (PASSWORD=)

UPDATE public.users SET
  role = 'admin',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Admin'
WHERE email = 'admin@demo.uni';

UPDATE public.users SET
  role = 'student',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Estudiante Demo'
WHERE email = 'estudiante@demo.uni';

UPDATE public.users SET
  role = 'dean',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  faculty_id = 'b0000000-0000-4000-8000-000000000001',
  full_name = 'Decano Demo'
WHERE email = 'decano@demo.uni';

UPDATE public.users SET
  role = 'rector',
  status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  full_name = 'Rector Demo'
WHERE email = 'rector@demo.uni';

-- Verificación
SELECT email, role, status, institution_id IS NOT NULL AS tiene_institucion
FROM public.users
WHERE email LIKE '%@demo.uni'
ORDER BY email;
