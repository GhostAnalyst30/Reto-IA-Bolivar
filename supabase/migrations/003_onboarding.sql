-- 003_onboarding.sql

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
  institution_id UUID NOT NULL REFERENCES institutions(id),
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

ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_auth_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- Institutions: public read active
CREATE POLICY institutions_public_read ON institutions FOR SELECT USING (is_active = TRUE);

-- Registration requests
CREATE POLICY reg_req_own ON registration_requests FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY reg_req_insert ON registration_requests FOR INSERT WITH CHECK (user_id = auth.uid());

-- Auth keys: admin only
CREATE POLICY auth_keys_admin ON role_auth_keys FOR ALL USING (is_admin());

-- Institutions readable by all authenticated
CREATE POLICY institutions_auth_read ON institutions FOR SELECT TO authenticated USING (is_active = TRUE);
