-- Make initiative_id nullable in agent_executions to support non-initiative agents (e.g. pitch_agent)
ALTER TABLE agent_executions ALTER COLUMN initiative_id DROP NOT NULL;
