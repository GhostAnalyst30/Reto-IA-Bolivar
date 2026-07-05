-- 002_rls.sql — RLS helpers y políticas
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
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychometric_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_risk_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- ─── Core policies ────────────────────────────────────────────────────────────

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

CREATE POLICY resource_embeddings_select ON resource_embeddings FOR SELECT USING (
  is_approved_user() AND EXISTS (
    SELECT 1 FROM resources r
    WHERE r.id = resource_embeddings.resource_id
      AND (
        r.institution_id IS NULL
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
            AND (u.role = 'platform_admin' OR u.institution_id IS NULL OR u.institution_id = r.institution_id)
        )
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

CREATE POLICY auth_keys_admin ON role_auth_keys FOR ALL USING (is_admin() OR is_platform_admin());

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

-- ─── Acompañamiento policies ──────────────────────────────────────────────────

CREATE POLICY student_profiles_own ON student_profiles FOR ALL
  USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY student_profiles_institutional ON student_profiles FOR SELECT
  USING (
    is_any_admin() OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid()
        AND u.role IN ('area_head','dean','vice_president','rector','admin','platform_admin')
        AND u.institution_id = (SELECT institution_id FROM users WHERE id = student_profiles.user_id)
    )
  );

CREATE POLICY psychometric_own ON psychometric_assessments FOR ALL
  USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY twin_own ON digital_twin_profiles FOR ALL
  USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY twin_institutional ON digital_twin_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles sp
      WHERE sp.user_id = digital_twin_profiles.user_id AND sp.twin_consent = TRUE
    )
    AND EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid()
        AND u.role IN ('area_head','dean','vice_president','rector','admin','platform_admin')
        AND u.institution_id = (SELECT institution_id FROM users WHERE id = digital_twin_profiles.user_id)
    )
  );

CREATE POLICY opportunities_select ON opportunities FOR SELECT
  USING (is_approved_user() AND is_active = TRUE);

CREATE POLICY opportunities_admin ON opportunities FOR ALL
  USING (is_any_admin());

CREATE POLICY saved_opportunities_own ON saved_opportunities FOR ALL
  USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY support_requests_own ON support_requests FOR ALL
  USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY support_requests_staff ON support_requests FOR SELECT
  USING (is_any_admin());

CREATE POLICY mood_own ON mood_checkins FOR ALL
  USING (user_id = auth.uid() AND is_approved_user());

CREATE POLICY risk_institutional ON student_risk_reports FOR SELECT
  USING (
    is_any_admin() OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid()
        AND u.role IN ('area_head','dean','vice_president','rector','admin','platform_admin')
        AND u.institution_id = student_risk_reports.institution_id
    )
  );

CREATE POLICY interventions_institutional ON interventions FOR ALL
  USING (
    is_any_admin() OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid()
        AND u.role IN ('area_head','dean','vice_president','rector','admin','platform_admin')
        AND u.institution_id = interventions.institution_id
    )
  );
