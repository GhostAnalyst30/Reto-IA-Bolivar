-- 007_drop_username.sql — Elimina el username. Las credenciales pasan a ser
-- únicamente correo + contraseña. Ejecutar sobre una base existente.

-- 1) Quitar índice, restricción de formato y columna username.
DROP INDEX IF EXISTS idx_users_username;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_username_format;
ALTER TABLE public.users DROP COLUMN IF EXISTS username;

-- 2) Trigger de creación de usuario sin username.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT := 'student';
  assigned_status TEXT := 'pending';
BEGIN
  -- El platform admin se aprueba automáticamente; el resto queda pendiente.
  IF lower(NEW.email) = 'ascendraemmanuel@gmail.com' THEN
    assigned_role := 'platform_admin';
    assigned_status := 'approved';
  END IF;

  INSERT INTO public.users (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    assigned_role,
    assigned_status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
