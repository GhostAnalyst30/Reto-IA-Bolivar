-- 018: Collapse institutional roles to student | admin | psychologist | platform_admin

-- Migrate legacy directivo roles → admin
UPDATE users
SET role = 'admin', updated_at = NOW()
WHERE role IN ('area_head', 'dean', 'vice_president', 'rector');

UPDATE registration_requests
SET requested_role = 'admin'
WHERE requested_role IN ('area_head', 'dean', 'vice_president', 'rector');

UPDATE role_auth_keys
SET role = 'admin'
WHERE role IN ('area_head', 'dean', 'vice_president', 'rector');

-- users.role check
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'admin', 'psychologist', 'platform_admin'));

-- registration_requests.requested_role check
ALTER TABLE registration_requests DROP CONSTRAINT IF EXISTS registration_requests_requested_role_check;
ALTER TABLE registration_requests
  ADD CONSTRAINT registration_requests_requested_role_check
  CHECK (requested_role IN ('student', 'admin', 'psychologist'));

-- role_auth_keys.role check
ALTER TABLE role_auth_keys DROP CONSTRAINT IF EXISTS role_auth_keys_role_check;
ALTER TABLE role_auth_keys
  ADD CONSTRAINT role_auth_keys_role_check
  CHECK (role IN ('admin', 'psychologist'));
