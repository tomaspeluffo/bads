import { z } from "zod";

export const initiativeStatuses = [
  "pending",
  "planning",
  "planned",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
] as const;

export type InitiativeStatus = (typeof initiativeStatuses)[number];

export const InitiativeSchema = z.object({
  id: z.string().uuid(),
  notion_page_id: z.string(),
  notion_url: z.string().nullable(),
  title: z.string(),
  raw_content: z.record(z.unknown()).nullable(),
  status: z.enum(initiativeStatuses),
  started_by: z.string().uuid().nullable(),
  error_message: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Initiative = z.infer<typeof InitiativeSchema>;

export const InsertInitiativeSchema = z.object({
  notion_page_id: z.string(),
  notion_url: z.string().nullable().optional(),
  title: z.string().min(1),
  raw_content: z.record(z.unknown()).nullable().optional(),
  status: z.enum(initiativeStatuses).default("pending"),
  started_by: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export type InsertInitiative = z.infer<typeof InsertInitiativeSchema>;
