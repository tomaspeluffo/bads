-- 005: Add local users table (replaces Supabase auth.users)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Update initiatives FK to reference local users table
ALTER TABLE initiatives DROP CONSTRAINT IF EXISTS initiatives_started_by_fkey;
ALTER TABLE initiatives ADD CONSTRAINT initiatives_started_by_fkey
  FOREIGN KEY (started_by) REFERENCES users(id) ON DELETE SET NULL;

-- Seed: test user with password "admin123"
-- Hash generated with bcryptjs.hashSync("admin123", 10)
INSERT INTO users (email, password_hash)
VALUES ('admin@bads.dev', '$2b$10$66dejQ9nkzms.Gk16pGgM.jXGM8OF2Ihyec/6o.svH/d4WNm9ubzy')
ON CONFLICT (email) DO NOTHING;
