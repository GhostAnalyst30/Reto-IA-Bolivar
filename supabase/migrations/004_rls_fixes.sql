-- 004_rls_fixes.sql — tighten RLS policies

-- Remove client-side privilege escalation on users table
DROP POLICY IF EXISTS users_update_own ON users;

-- KPIs scoped to user's institution
DROP POLICY IF EXISTS kpis_institutional ON institutional_kpis;
CREATE POLICY kpis_institutional ON institutional_kpis FOR SELECT USING (
  is_approved_user() AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.role != 'student'
      AND u.institution_id = institutional_kpis.institution_id
  )
);

-- Security events: no open insert from authenticated clients
DROP POLICY IF EXISTS security_events_insert ON security_events;

-- Faculties: read-only for approved users in same institution
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
CREATE POLICY faculties_read ON faculties FOR SELECT USING (
  is_approved_user() AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.institution_id = faculties.institution_id
  )
);

-- Resources scoped by institution when user has one assigned
DROP POLICY IF EXISTS resources_select ON resources;
CREATE POLICY resources_select ON resources FOR SELECT USING (
  is_approved_user() AND (
    institution_id IS NULL
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (u.institution_id IS NULL OR u.institution_id = resources.institution_id)
    )
  )
);

-- Prevent direct client inserts on registration_requests with elevated roles
DROP POLICY IF EXISTS reg_req_insert ON registration_requests;
CREATE POLICY reg_req_insert ON registration_requests FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND requested_role = 'student'
);
