UPDATE public.users SET
  role = 'platform_admin',
  status = 'approved',
  institution_id = NULL,
  full_name = 'Administrador UTB Te acompaña'
WHERE email = 'ascendraemmanuel@gmail.com';

SELECT email, role, status, institution_id
FROM public.users
WHERE email = 'ascendraemmanuel@gmail.com';
