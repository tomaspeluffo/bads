-- Migration: Add 'plan_review' status to initiative_status enum
-- Used when the planner has produced a plan and is waiting for user approval
-- before features are created.

ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'plan_review' AFTER 'planning';
