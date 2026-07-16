-- Permite mensajes del psicólogo de bienestar en chats del Digital Twin.

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_role_check;
ALTER TABLE messages ADD CONSTRAINT messages_role_check
  CHECK (role IN ('user', 'assistant', 'system', 'counselor'));
