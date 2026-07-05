-- 008_auth_username.sql — Migración idempotente: username + limpieza vocacional
-- Ejecutar en instalaciones existentes después de 001-007

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE public.users
SET username = lower(regexp_replace(split_part(email, '@', 1), '[^a-z0-9_]', '_', 'g'))
WHERE username IS NULL OR trim(username) = '';

UPDATE public.users SET username = 'admin' WHERE email = 'ascendraemmanuel@gmail.com';
UPDATE public.users SET username = 'admin' WHERE email = 'admin@bolivar.ia.com' AND username IS DISTINCT FROM 'admin';

ALTER TABLE public.users ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_domain;
ALTER TABLE public.users ADD CONSTRAINT users_email_domain CHECK (
  role = 'platform_admin'
  OR email ILIKE '%@utb.edu.co'
  OR email ILIKE '%@utb.demo'
);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_username_format;
ALTER TABLE public.users ADD CONSTRAINT users_username_format CHECK (username ~ '^[a-z][a-z0-9_]{2,29}$');

DROP TABLE IF EXISTS public.vocational_assessments CASCADE;
