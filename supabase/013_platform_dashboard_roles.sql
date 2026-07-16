-- Extend platform_dashboard_stats with role/institution breakdowns (avoids full user scan in API).

CREATE OR REPLACE FUNCTION platform_dashboard_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*)::INT FROM users),
    'total_institutions', (SELECT COUNT(*)::INT FROM institutions),
    'active_institutions', (
      SELECT COUNT(*)::INT FROM institutions WHERE is_active = TRUE
    ),
    'pending_requests', (
      SELECT COUNT(*)::INT FROM registration_requests WHERE status = 'pending'
    ),
    'unlinked_users', (
      SELECT COUNT(*)::INT FROM users
      WHERE institution_id IS NULL
        AND role <> 'platform_admin'
    ),
    'users_by_role', COALESCE((
      SELECT json_object_agg(role, cnt)
      FROM (
        SELECT COALESCE(role, 'unknown') AS role, COUNT(*)::INT AS cnt
        FROM users
        GROUP BY role
      ) r
    ), '{}'::json),
    'users_by_institution', COALESCE((
      SELECT json_object_agg(institution_id::text, cnt)
      FROM (
        SELECT institution_id, COUNT(*)::INT AS cnt
        FROM users
        WHERE institution_id IS NOT NULL
        GROUP BY institution_id
      ) i
    ), '{}'::json)
  );
$$;
