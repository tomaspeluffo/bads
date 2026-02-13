-- Migration: Add clients table and link initiatives to clients

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE initiatives ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_initiatives_client_id ON initiatives(client_id);

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();

