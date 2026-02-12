import { z } from "zod";

export const agentTypes = [
  "planner",
  "task_decomposer",
  "developer",
  "qa",
] as const;

export type AgentType = (typeof agentTypes)[number];

export const AgentExecutionSchema = z.object({
  id: z.string().uuid(),
  agent: z.enum(agentTypes),
  initiative_id: z.string().uuid(),
  feature_id: z.string().uuid().nullable(),
  task_id: z.string().uuid().nullable(),
  input_tokens: z.number().int(),
  output_tokens: z.number().int(),
  duration_ms: z.number().int(),
  model: z.string(),
  status: z.string(),
  created_at: z.string(),
});

export type AgentExecution = z.infer<typeof AgentExecutionSchema>;

export const InsertAgentExecutionSchema = z.object({
  agent: z.enum(agentTypes),
  initiative_id: z.string().uuid(),
  feature_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
  input_tokens: z.number().int(),
  output_tokens: z.number().int(),
  duration_ms: z.number().int(),
  model: z.string(),
  status: z.string(),
});

export type InsertAgentExecution = z.infer<typeof InsertAgentExecutionSchema>;
