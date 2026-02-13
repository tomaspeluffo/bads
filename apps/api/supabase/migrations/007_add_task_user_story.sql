-- Add user_story and acceptance_criteria to tasks
-- Enables User Story format (Who/What/Why) + Criteria of Done per task

ALTER TABLE tasks
  ADD COLUMN user_story TEXT,
  ADD COLUMN acceptance_criteria JSONB;

COMMENT ON COLUMN tasks.user_story IS 'User story en formato "Como [rol], quiero [acción] para [beneficio]"';
COMMENT ON COLUMN tasks.acceptance_criteria IS 'Array de criterios de aceptación verificables';
