-- 001_schema.sql — Extensiones, tablas, funciones y triggers
-- Ejecutar después de 000_reset.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Core ───────────────────────────────────────────────────────────────────

CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE(institution_id, slug)
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN (
    'student', 'area_head', 'dean', 'vice_president', 'rector', 'admin', 'platform_admin'
  )),
  institution_id UUID REFERENCES institutions(id),
  faculty_id UUID REFERENCES faculties(id),
  area_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT users_email_domain CHECK (
    role = 'platform_admin'
    OR email ILIKE '%@utb.edu.co'
    OR email ILIKE '%@utb.demo'
  ),
  CONSTRAINT users_username_format CHECK (username ~ '^[a-z][a-z0-9_]{2,29}$')
);

CREATE INDEX idx_users_username ON users(username);

ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES users(id);

CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  topic TEXT,
  resource_type TEXT DEFAULT 'article',
  source TEXT,
  scraped_at TIMESTAMPTZ,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resources_search ON resources USING GIN(search_vector);

CREATE TABLE resource_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Nueva conversación',
  context_resource_id UUID REFERENCES resources(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE institutional_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  period TEXT,
  faculty_id UUID REFERENCES faculties(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Learning & security ────────────────────────────────────────────────────

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_label TEXT,
  portal TEXT CHECK (portal IN ('student', 'institutional', 'platform')),
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id)
);

CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE saved_resources (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, resource_id)
);

CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE learning_path_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  title TEXT NOT NULL,
  resource_id UUID REFERENCES resources(id),
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(path_id, step_order)
);

CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

-- ─── Onboarding ─────────────────────────────────────────────────────────────

CREATE TABLE role_auth_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('area_head', 'dean', 'vice_president', 'rector')),
  key_hash TEXT NOT NULL,
  label TEXT,
  max_uses INT DEFAULT 1,
  uses_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id),
  requested_role TEXT NOT NULL CHECK (requested_role IN (
    'student', 'area_head', 'dean', 'vice_president', 'rector'
  )),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  auth_key_id UUID REFERENCES role_auth_keys(id),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX idx_registration_requests_status ON registration_requests(status) WHERE status = 'pending';
CREATE INDEX idx_role_auth_keys_institution_role ON role_auth_keys(institution_id, role) WHERE revoked_at IS NULL;
CREATE INDEX idx_security_events_created ON security_events(created_at DESC);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id) WHERE is_active = TRUE;

-- ─── Programas académicos UTB ───────────────────────────────────────────────

CREATE TABLE academic_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  faculty_id UUID REFERENCES faculties(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE program_curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES academic_programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Auth trigger ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
      lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '_', 'g'))
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Search functions ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10
)
RETURNS TABLE (id UUID, resource_id UUID, chunk_text TEXT, similarity FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT re.id, re.resource_id, re.chunk_text,
         1 - (re.embedding <=> query_embedding) AS similarity
  FROM resource_embeddings re
  WHERE re.embedding IS NOT NULL
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION search_resources_text(search_query TEXT, match_count INT DEFAULT 20)
RETURNS TABLE (id UUID, title TEXT, description TEXT, topic TEXT, rank REAL)
LANGUAGE sql STABLE AS $$
  SELECT r.id, r.title, r.description, r.topic,
         ts_rank(r.search_vector, plainto_tsquery('spanish', search_query)) AS rank
  FROM resources r
  WHERE r.search_vector @@ plainto_tsquery('spanish', search_query)
  ORDER BY rank DESC
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION update_resource_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish',
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.topic, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resources_search_vector_update ON public.resources;
CREATE TRIGGER resources_search_vector_update
  BEFORE INSERT OR UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_resource_search_vector();
