-- Alinear active_7d con el motor de riesgo (solo chats digital_twin, ventana 7 días).

CREATE OR REPLACE FUNCTION institution_dashboard_stats(p_institution_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH students AS (
    SELECT id
    FROM users
    WHERE institution_id = p_institution_id
      AND role = 'student'
      AND status = 'approved'
  ),
  week_boundary AS (
    SELECT (NOW() AT TIME ZONE 'UTC' - INTERVAL '7 days') AS ts
  ),
  engagement AS (
    SELECT
      (SELECT COUNT(*)::INT FROM students) AS enrollment,
      (
        SELECT COUNT(DISTINCT c.user_id)::INT
        FROM chats c
        INNER JOIN students s ON s.id = c.user_id
        CROSS JOIN week_boundary w
        WHERE c.chat_type = 'digital_twin'
          AND c.updated_at >= w.ts
      ) AS active_7d,
      (
        SELECT COUNT(*)::INT
        FROM chats c
        INNER JOIN students s ON s.id = c.user_id
      ) AS chats_count,
      (
        SELECT COUNT(*)::INT
        FROM messages m
        INNER JOIN chats c ON c.id = m.chat_id
        INNER JOIN students s ON s.id = c.user_id
      ) AS messages_count,
      (
        SELECT COUNT(*)::INT
        FROM psychometric_assessments
        WHERE institution_id = p_institution_id
          AND status = 'completed'
      ) AS psychometric_count,
      (
        SELECT COUNT(*)::INT
        FROM saved_resources sr
        INNER JOIN students s ON s.id = sr.user_id
      ) AS saved_count,
      (
        SELECT COALESCE(AVG(sp.progress_percent), 0)::FLOAT
        FROM student_progress sp
        INNER JOIN students s ON s.id = sp.user_id
      ) AS avg_progress,
      (
        SELECT COALESCE(AVG(srr.risk_score), 0)::FLOAT
        FROM (
          SELECT DISTINCT ON (user_id) user_id, risk_score, risk_level
          FROM student_risk_reports
          WHERE institution_id = p_institution_id
          ORDER BY user_id, computed_at DESC
        ) srr
      ) AS avg_risk_score,
      (
        SELECT COUNT(*)::INT
        FROM (
          SELECT DISTINCT ON (user_id) user_id, risk_level
          FROM student_risk_reports
          WHERE institution_id = p_institution_id
          ORDER BY user_id, computed_at DESC
        ) srr
        WHERE srr.risk_level IN ('alto', 'moderado')
      ) AS at_risk_count
  )
  SELECT json_build_object(
    'enrollment', enrollment,
    'active_7d', active_7d,
    'chats_count', chats_count,
    'messages_count', messages_count,
    'psychometric_count', psychometric_count,
    'saved_count', saved_count,
    'avg_progress', avg_progress,
    'avg_risk_score', avg_risk_score,
    'at_risk_count', at_risk_count
  )
  FROM engagement;
$$;
