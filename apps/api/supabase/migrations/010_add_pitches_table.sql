ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'pitch_agent';

CREATE TABLE pitches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  brief         TEXT NOT NULL,
  client_name   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','generating','ready','failed','converted')),
  content       JSONB,
  error_message TEXT,
  initiative_id UUID REFERENCES initiatives(id) ON DELETE SET NULL,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pitches_client_id ON pitches(client_id);
CREATE INDEX idx_pitches_status ON pitches(status);

CREATE TRIGGER trg_pitches_updated_at
  BEFORE UPDATE ON pitches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
