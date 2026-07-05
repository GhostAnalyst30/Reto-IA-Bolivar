-- 000_reset.sql — Elimina todo el esquema del proyecto en public
-- Ejecutar en Supabase → SQL Editor (paso 1 de instalación limpia)
--
-- NOTA: No borra usuarios de Authentication (auth.users).
--       Para demo UTB, elimínalos en Dashboard → Authentication o vuelve a ejecutar scripts/seed-utb-users.ts

-- Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS resources_search_vector_update ON public.resources;

-- Tablas (orden por dependencias FK)
DROP TABLE IF EXISTS public.interventions CASCADE;
DROP TABLE IF EXISTS public.student_risk_reports CASCADE;
DROP TABLE IF EXISTS public.mood_checkins CASCADE;
DROP TABLE IF EXISTS public.support_requests CASCADE;
DROP TABLE IF EXISTS public.saved_opportunities CASCADE;
DROP TABLE IF EXISTS public.opportunities CASCADE;
DROP TABLE IF EXISTS public.digital_twin_profiles CASCADE;
DROP TABLE IF EXISTS public.psychometric_assessments CASCADE;
DROP TABLE IF EXISTS public.student_profiles CASCADE;
DROP TABLE IF EXISTS public.vocational_assessments CASCADE;
DROP TABLE IF EXISTS public.program_curricula CASCADE;
DROP TABLE IF EXISTS public.academic_programs CASCADE;
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
DROP FUNCTION IF EXISTS public.is_platform_admin();
DROP FUNCTION IF EXISTS public.is_any_admin();
DROP FUNCTION IF EXISTS public.is_admin();
