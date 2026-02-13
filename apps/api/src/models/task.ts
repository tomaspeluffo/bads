import { z } from "zod";

export const taskStatuses = [
  "to_do",
  "doing",
  "review",
  "done",
  "failed",
] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export const TaskSchema = z.object({
  id: z.string().uuid(),
  feature_id: z.string().uuid(),
  sequence_order: z.number().int(),
  title: z.string(),
  description: z.string(),
  user_story: z.string().nullable(),
  acceptance_criteria: z.array(z.string()).nullable(),
  task_type: z.string(),
  file_paths: z.array(z.string()).nullable(),
  status: z.enum(taskStatuses),
  agent_output: z.record(z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Task = z.infer<typeof TaskSchema>;

export const InsertTaskSchema = z.object({
  feature_id: z.string().uuid(),
  sequence_order: z.number().int(),
  title: z.string().min(1),
  description: z.string().min(1),
  user_story: z.string().nullable().optional(),
  acceptance_criteria: z.array(z.string()).nullable().optional(),
  task_type: z.string().min(1),
  file_paths: z.array(z.string()).nullable().optional(),
  status: z.enum(taskStatuses).default("to_do"),
  agent_output: z.record(z.unknown()).nullable().optional(),
});

export type InsertTask = z.infer<typeof InsertTaskSchema>;
