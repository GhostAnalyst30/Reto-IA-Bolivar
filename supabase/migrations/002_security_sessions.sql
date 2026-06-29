-- 002_security_sessions.sql

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_label TEXT,
  portal TEXT CHECK (portal IN ('student', 'institutional')),
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

-- RLS enable
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutional_kpis ENABLE ROW LEVEL SECURITY;

-- Helper: current user approved
CREATE OR REPLACE FUNCTION is_approved_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Users policies
CREATE POLICY users_select_own ON users FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY users_update_own ON users FOR UPDATE USING (id = auth.uid());

-- Resources: approved users read
CREATE POLICY resources_select ON resources FOR SELECT USING (is_approved_user());

-- Chats
CREATE POLICY chats_all ON chats FOR ALL USING (user_id = auth.uid() AND is_approved_user());
CREATE POLICY messages_all ON messages FOR ALL USING (
  EXISTS (SELECT 1 FROM chats c WHERE c.id = chat_id AND c.user_id = auth.uid()) AND is_approved_user()
);

-- Saved resources
CREATE POLICY saved_resources_all ON saved_resources FOR ALL USING (user_id = auth.uid() AND is_approved_user());

-- Learning paths
CREATE POLICY learning_paths_all ON learning_paths FOR ALL USING (user_id = auth.uid() AND is_approved_user());
CREATE POLICY learning_path_steps_all ON learning_path_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM learning_paths lp WHERE lp.id = path_id AND lp.user_id = auth.uid()) AND is_approved_user()
);

-- Progress
CREATE POLICY student_progress_all ON student_progress FOR ALL USING (user_id = auth.uid() AND is_approved_user());

-- KPIs: institutional roles
CREATE POLICY kpis_institutional ON institutional_kpis FOR SELECT USING (
  is_approved_user() AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role != 'student'
  )
);

-- Security events: admin only
CREATE POLICY security_events_admin ON security_events FOR SELECT USING (is_admin());
CREATE POLICY security_events_insert ON security_events FOR INSERT WITH CHECK (true);

-- Sessions
CREATE POLICY sessions_own ON user_sessions FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY sessions_admin ON user_sessions FOR UPDATE USING (is_admin());

CREATE INDEX idx_security_events_created ON security_events(created_at DESC);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id) WHERE is_active = TRUE;
