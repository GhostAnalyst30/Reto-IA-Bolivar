-- Permite ascendraemmanuel@gmail.com como excepción al dominio @utb.edu.co
-- (excepción temporal de dominio para pruebas fuera de @utb.edu.co).

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_domain;

ALTER TABLE public.users ADD CONSTRAINT users_email_domain CHECK (
  role = 'platform_admin'
  OR email ILIKE '%@utb.edu.co'
  OR lower(email) = 'ascendraemmanuel@gmail.com'
);
