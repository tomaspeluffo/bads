-- Add user_story and developer_context to features
ALTER TABLE features
  ADD COLUMN user_story TEXT,
  ADD COLUMN developer_context TEXT;

-- Remove user_story and acceptance_criteria from tasks
ALTER TABLE tasks
  DROP COLUMN IF EXISTS user_story,
  DROP COLUMN IF EXISTS acceptance_criteria;
