-- Migration: Add 'needs_info' status to initiative_status enum
-- Used when the planner agent determines the pitch is incomplete
-- and needs additional information before creating a plan.

ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'needs_info' AFTER 'planning';
