-- Índices compuestos para chats / riesgo / psicometría (producción Vercel+Render+Supabase).

CREATE INDEX IF NOT EXISTS idx_messages_chat_created
  ON messages(chat_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chats_user_type_updated
  ON chats(user_id, chat_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_user_status
  ON support_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_risk_composite
  ON student_risk_reports(institution_id, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_psych_user_status
  ON psychometric_assessments(user_id, status);
