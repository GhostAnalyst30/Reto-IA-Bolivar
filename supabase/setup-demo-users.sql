-- UTB demo user profile updates (run AFTER scripts/seed-utb-users.ts)
-- Password default: Demo2026! or SEED_DEMO_PASSWORD from .env

UPDATE public.users SET role = 'admin', status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001', full_name = 'Admin UTB'
WHERE email = 'admin@utb.demo';

UPDATE public.users SET role = 'rector', status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001', full_name = 'Rector UTB'
WHERE email = 'rector@utb.demo';

UPDATE public.users SET role = 'vice_president', status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001', full_name = 'Vicerrector UTB'
WHERE email = 'vicerrector@utb.demo';

UPDATE public.users SET role = 'dean', status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  faculty_id = 'b0000000-0000-4000-8000-000000000001', full_name = 'Decano UTB'
WHERE email = 'decano@utb.demo';

UPDATE public.users SET role = 'area_head', status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001',
  faculty_id = 'b0000000-0000-4000-8000-000000000001', full_name = 'Director de Programa UTB'
WHERE email = 'director.programa@utb.demo';

UPDATE public.users SET role = 'student', status = 'approved',
  institution_id = 'a0000000-0000-4000-8000-000000000001'
WHERE email LIKE 'estudiante%@utb.demo';

SELECT email, role, status FROM public.users WHERE email LIKE '%@utb.demo' ORDER BY email;
