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
