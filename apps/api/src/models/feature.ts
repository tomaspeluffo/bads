import { z } from "zod";

export const featureStatuses = [
  "pending",
  "decomposing",
  "developing",
  "qa_review",
  "human_review",
  "approved",
  "merging",
  "merged",
  "rejected",
  "failed",
] as const;

export type FeatureStatus = (typeof featureStatuses)[number];

export const FeatureSchema = z.object({
  id: z.string().uuid(),
  plan_id: z.string().uuid(),
  initiative_id: z.string().uuid(),
  sequence_order: z.number().int(),
  title: z.string(),
  description: z.string(),
  acceptance_criteria: z.array(z.string()).nullable(),
  user_story: z.string().nullable(),
  developer_context: z.string().nullable(),
  branch_name: z.string().nullable(),
  pr_number: z.number().int().nullable(),
  pr_url: z.string().nullable(),
  status: z.enum(featureStatuses),
  rejection_feedback: z.string().nullable(),
  retry_count: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Feature = z.infer<typeof FeatureSchema>;

export const InsertFeatureSchema = z.object({
  plan_id: z.string().uuid(),
  initiative_id: z.string().uuid(),
  sequence_order: z.number().int(),
  title: z.string().min(1),
  description: z.string().min(1),
  acceptance_criteria: z.array(z.string()).nullable().optional(),
  user_story: z.string().nullable().optional(),
  developer_context: z.string().nullable().optional(),
  branch_name: z.string().nullable().optional(),
  status: z.enum(featureStatuses).default("pending"),
  retry_count: z.number().int().default(0),
});

export type InsertFeature = z.infer<typeof InsertFeatureSchema>;
