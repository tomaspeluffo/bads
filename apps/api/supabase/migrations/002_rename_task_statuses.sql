-- Migration: Rename task statuses from pending/in_progress/completed/failed
-- to to_do/doing/review/done/failed

-- 1. Add new values to the enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'to_do';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'doing';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'done';

-- 2. Migrate existing rows to new values
UPDATE tasks SET status = 'to_do' WHERE status = 'pending';
UPDATE tasks SET status = 'doing' WHERE status = 'in_progress';
UPDATE tasks SET status = 'done' WHERE status = 'completed';
-- 'failed' stays the same

-- 3. Update the default
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'to_do'::task_status;

-- Note: PostgreSQL does not support removing values from an enum.
-- The old values (pending, in_progress, completed) remain in the type
-- but are no longer used by the application.
