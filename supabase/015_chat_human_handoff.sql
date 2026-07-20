-- Handoff humano: psicólogo real responde en el mismo hilo de chat.

ALTER TABLE chats ADD COLUMN IF NOT EXISTS handoff_mode TEXT NOT NULL DEFAULT 'ai'
  CHECK (handoff_mode IN ('ai', 'human', 'resolved'));

ALTER TABLE chats ADD COLUMN IF NOT EXISTS handoff_at TIMESTAMPTZ;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chats_handoff_mode ON chats(handoff_mode) WHERE handoff_mode = 'human';
