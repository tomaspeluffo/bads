ALTER TABLE tasks ADD COLUMN prompt TEXT;

ALTER TYPE feature_status ADD VALUE IF NOT EXISTS 'decomposed' AFTER 'decomposing';
