-- Reset completo del esquema public (tablas, triggers, funciones y políticas del proyecto).
-- Ejecutar en Supabase → SQL Editor.
--
-- IMPORTANTE: esto NO borra usuarios de Authentication. Hazlo aparte (paso 2 del README abajo).

-- Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS resources_search_vector_update ON public.resources;

-- Tablas (orden con CASCADE por dependencias FK)
DROP TABLE IF EXISTS public.registration_requests CASCADE;
DROP TABLE IF EXISTS public.role_auth_keys CASCADE;
DROP TABLE IF EXISTS public.student_progress CASCADE;
DROP TABLE IF EXISTS public.learning_path_steps CASCADE;
DROP TABLE IF EXISTS public.learning_paths CASCADE;
DROP TABLE IF EXISTS public.saved_resources CASCADE;
DROP TABLE IF EXISTS public.security_events CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.resource_embeddings CASCADE;
DROP TABLE IF EXISTS public.institutional_kpis CASCADE;
DROP TABLE IF EXISTS public.resources CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.faculties CASCADE;
DROP TABLE IF EXISTS public.institutions CASCADE;

-- Funciones
DROP FUNCTION IF EXISTS public.match_embeddings(vector, integer);
DROP FUNCTION IF EXISTS public.search_resources_text(text, integer);
DROP FUNCTION IF EXISTS public.update_resource_search_vector();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_approved_user();
DROP FUNCTION IF EXISTS public.is_admin();

-- Extensiones (opcional: descomenta si quieres quitarlas también)
-- DROP EXTENSION IF EXISTS vector;
-- DROP EXTENSION IF EXISTS "uuid-ossp";
