import { z } from "zod";

export const PlanSchema = z.object({
  id: z.string().uuid(),
  initiative_id: z.string().uuid(),
  version: z.number().int(),
  summary: z.string(),
  raw_output: z.record(z.unknown()).nullable(),
  feature_count: z.number().int(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Plan = z.infer<typeof PlanSchema>;

export const InsertPlanSchema = z.object({
  initiative_id: z.string().uuid(),
  version: z.number().int().default(1),
  summary: z.string().min(1),
  raw_output: z.record(z.unknown()).nullable().optional(),
  feature_count: z.number().int(),
  is_active: z.boolean().default(true),
});

export type InsertPlan = z.infer<typeof InsertPlanSchema>;
