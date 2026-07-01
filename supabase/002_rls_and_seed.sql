-- 002_rls_and_seed.sql — RLS y políticas (sin datos de instituciones)
-- Ejecutar después de 001_schema.sql

-- ─── RLS helpers ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_approved_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'platform_admin' AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_any_admin()
RETURNS BOOLEAN AS $$
  SELECT is_platform_admin() OR is_admin();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Enable RLS ─────────────────────────────────────────────────────────────

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
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_auth_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocational_assessments ENABLE ROW LEVEL SECURITY;

-- ─── Policies ─────────────────────────────────────────────────────────────

CREATE POLICY users_select_own ON users FOR SELECT USING (
  id = auth.uid() OR is_any_admin()
);

CREATE POLICY users_update_own ON users FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY resources_select ON resources FOR SELECT USING (
  is_approved_user() AND (
    institution_id IS NULL
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.role = 'platform_admin' OR u.institution_id IS NULL OR u.institution_id = resources.institution_id)
    )
  )
);

CREATE POLICY chats_all ON chats FOR ALL USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY messages_all ON messages FOR ALL USING (
  EXISTS (SELECT 1 FROM chats c WHERE c.id = chat_id AND c.user_id = auth.uid())
  AND is_approved_user()
);

CREATE POLICY saved_resources_all ON saved_resources FOR ALL USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY learning_paths_all ON learning_paths FOR ALL USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY learning_path_steps_all ON learning_path_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM learning_paths lp WHERE lp.id = path_id AND lp.user_id = auth.uid())
  AND is_approved_user()
);

CREATE POLICY student_progress_all ON student_progress FOR ALL USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY kpis_institutional ON institutional_kpis FOR SELECT USING (
  is_approved_user() AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.role != 'student'
      AND (u.role = 'platform_admin' OR u.institution_id = institutional_kpis.institution_id)
  )
);

CREATE POLICY security_events_admin ON security_events FOR SELECT USING (is_any_admin());

CREATE POLICY sessions_own ON user_sessions FOR SELECT USING (user_id = auth.uid() OR is_any_admin());
CREATE POLICY sessions_admin ON user_sessions FOR UPDATE USING (is_any_admin());

CREATE POLICY institutions_public_read ON institutions FOR SELECT USING (is_active = TRUE);
CREATE POLICY institutions_auth_read ON institutions FOR SELECT TO authenticated USING (is_active = TRUE OR is_platform_admin());
CREATE POLICY institutions_platform_all ON institutions FOR ALL USING (is_platform_admin());

CREATE POLICY reg_req_own ON registration_requests FOR SELECT USING (
  user_id = auth.uid() OR is_any_admin()
);
CREATE POLICY reg_req_insert ON registration_requests FOR INSERT WITH CHECK (
  user_id = auth.uid() AND requested_role = 'student'
);

CREATE POLICY auth_keys_admin ON role_auth_keys FOR ALL USING (is_admin());

CREATE POLICY faculties_read ON faculties FOR SELECT USING (
  is_approved_user() AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND (u.role = 'platform_admin' OR u.institution_id = faculties.institution_id)
  )
);

CREATE POLICY programs_read ON academic_programs FOR SELECT USING (
  is_active = TRUE AND (
    institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid() AND status = 'approved')
    OR is_any_admin()
  )
);

CREATE POLICY programs_admin ON academic_programs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin' AND institution_id = academic_programs.institution_id
  )
);

CREATE POLICY curricula_read ON program_curricula FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM academic_programs p
    JOIN users u ON u.institution_id = p.institution_id
    WHERE p.id = program_curricula.program_id AND u.id = auth.uid() AND u.status = 'approved'
  )
);

CREATE POLICY vocational_own ON vocational_assessments FOR ALL USING (user_id = auth.uid());
