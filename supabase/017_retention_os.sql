-- Retention OS: Sentinel, CareQueue, ActionPlan, Outreach, deferred risk recompute.

-- Deferred risk recompute (instead of persist_single_risk_report on every action)
CREATE TABLE IF NOT EXISTS risk_recompute_queue (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  triggered_by TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_queue_inst_queued
  ON risk_recompute_queue(institution_id, queued_at);

-- Sentinel proactive outreach log (avoid spamming same student)
CREATE TABLE IF NOT EXISTS sentinel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  trajectory TEXT NOT NULL CHECK (trajectory IN ('estable', 'empeorando', 'critico')),
  reason TEXT NOT NULL,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  care_ticket_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_user_created
  ON sentinel_events(user_id, created_at DESC);

-- CareQueue: unified intervention tickets
CREATE TABLE IF NOT EXISTS care_queue_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('risk', 'handoff', 'support', 'sentinel')),
  status TEXT NOT NULL DEFAULT 'nuevo'
    CHECK (status IN ('nuevo', 'contactado', 'seguimiento', 'resuelto')),
  priority_score REAL NOT NULL DEFAULT 0,
  urgency TEXT NOT NULL DEFAULT 'media'
    CHECK (urgency IN ('baja', 'media', 'alta', 'critica')),
  dominant_cause TEXT,
  risk_level TEXT,
  risk_score REAL,
  summary TEXT,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  support_request_id UUID REFERENCES support_requests(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  sla_due_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_queue_open
  ON care_queue_tickets(institution_id, status, priority_score DESC)
  WHERE status <> 'resuelto';

CREATE INDEX IF NOT EXISTS idx_care_queue_student
  ON care_queue_tickets(student_id, created_at DESC);

-- Extend interventions for ActionPlan steps
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS dominant_cause TEXT;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS plan_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS care_ticket_id UUID REFERENCES care_queue_tickets(id) ON DELETE SET NULL;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS title TEXT;

-- Outreach email log
CREATE TABLE IF NOT EXISTS outreach_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  segment TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'skipped', 'failed')),
  brevo_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_user_segment
  ON outreach_logs(user_id, segment, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_inst_created
  ON outreach_logs(institution_id, created_at DESC);

-- Link sentinel -> care tickets FK after care_queue exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sentinel_events_care_ticket_id_fkey'
  ) THEN
    ALTER TABLE sentinel_events
      ADD CONSTRAINT sentinel_events_care_ticket_id_fkey
      FOREIGN KEY (care_ticket_id) REFERENCES care_queue_tickets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- RLS (service role bypasses; policies for completeness)
ALTER TABLE risk_recompute_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentinel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_queue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS care_queue_institutional ON care_queue_tickets;
CREATE POLICY care_queue_institutional ON care_queue_tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.institution_id = care_queue_tickets.institution_id
        AND u.role IN ('admin', 'area_head', 'dean', 'vice_president', 'rector', 'platform_admin')
    )
  );

DROP POLICY IF EXISTS outreach_institutional ON outreach_logs;
CREATE POLICY outreach_institutional ON outreach_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.institution_id = outreach_logs.institution_id
        AND u.role IN ('admin', 'area_head', 'dean', 'vice_president', 'rector', 'platform_admin')
    )
  );
