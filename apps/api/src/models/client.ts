import { z } from "zod";

export const ClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Client = z.infer<typeof ClientSchema>;

export const InsertClientSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().nullable().optional(),
});

export type InsertClient = z.infer<typeof InsertClientSchema>;
