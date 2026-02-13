-- BADS Schema Migration
-- Creates all tables, enums, and indices for the multi-agent pipeline

-- Enums
CREATE TYPE initiative_status AS ENUM (
  'pending', 'planning', 'planned', 'in_progress',
  'completed', 'failed', 'cancelled'
);

CREATE TYPE feature_status AS ENUM (
  'pending', 'decomposing', 'developing', 'qa_review',
  'human_review', 'approved', 'merging', 'merged',
  'rejected', 'failed'
);

CREATE TYPE task_status AS ENUM (
  'pending', 'in_progress', 'completed', 'failed'
);

CREATE TYPE agent_type AS ENUM (
  'planner', 'task_decomposer', 'developer', 'qa'
);

CREATE TYPE memory_type AS ENUM (
  'pattern', 'decision', 'error_fix', 'convention'
);

-- Tables

CREATE TABLE initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT UNIQUE NOT NULL,
  notion_url TEXT,
  title TEXT NOT NULL,
  raw_content JSONB,
  status initiative_status NOT NULL DEFAULT 'pending',
  started_by UUID,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  summary TEXT NOT NULL,
  raw_output JSONB,
  feature_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  acceptance_criteria JSONB,
  branch_name TEXT,
  pr_number INTEGER,
  pr_url TEXT,
  status feature_status NOT NULL DEFAULT 'pending',
  rejection_feedback TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  task_type TEXT NOT NULL,
  file_paths TEXT[],
  status task_status NOT NULL DEFAULT 'pending',
  agent_output JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent agent_type NOT NULL,
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES features(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type memory_type NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_initiative_id UUID REFERENCES initiatives(id) ON DELETE SET NULL,
  tags TEXT[],
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX idx_initiatives_status ON initiatives(status);
CREATE INDEX idx_initiatives_notion_page_id ON initiatives(notion_page_id);

CREATE INDEX idx_plans_initiative_id ON plans(initiative_id);
CREATE INDEX idx_plans_active ON plans(initiative_id, is_active) WHERE is_active = true;

CREATE INDEX idx_features_plan_id ON features(plan_id);
CREATE INDEX idx_features_initiative_id ON features(initiative_id);
CREATE INDEX idx_features_status ON features(status);
CREATE INDEX idx_features_order ON features(initiative_id, sequence_order);

CREATE INDEX idx_tasks_feature_id ON tasks(feature_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_order ON tasks(feature_id, sequence_order);

CREATE INDEX idx_executions_initiative ON agent_executions(initiative_id);
CREATE INDEX idx_executions_agent ON agent_executions(agent);

CREATE INDEX idx_memory_type ON memory_entries(type);
CREATE INDEX idx_memory_category ON memory_entries(category);
CREATE INDEX idx_memory_tags ON memory_entries USING GIN(tags);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_initiatives_updated_at
  BEFORE UPDATE ON initiatives FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_features_updated_at
  BEFORE UPDATE ON features FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_memory_entries_updated_at
  BEFORE UPDATE ON memory_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

