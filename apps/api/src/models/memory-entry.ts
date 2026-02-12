import { z } from "zod";

export const memoryTypes = [
  "pattern",
  "decision",
  "error_fix",
  "convention",
] as const;

export type MemoryType = (typeof memoryTypes)[number];

export const MemoryEntrySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(memoryTypes),
  category: z.string(),
  title: z.string(),
  content: z.string(),
  source_initiative_id: z.string().uuid().nullable(),
  tags: z.array(z.string()).nullable(),
  usage_count: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export const InsertMemoryEntrySchema = z.object({
  type: z.enum(memoryTypes),
  category: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  source_initiative_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  usage_count: z.number().int().default(0),
});

export type InsertMemoryEntry = z.infer<typeof InsertMemoryEntrySchema>;
