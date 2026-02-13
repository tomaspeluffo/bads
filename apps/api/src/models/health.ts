import { z } from "zod";

export const ComponentStatusSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  latencyMs: z.number().optional(),
  message: z.string().optional(),
});

export type ComponentStatus = z.infer<typeof ComponentStatusSchema>;

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  timestamp: z.string().datetime(),
  version: z.string(),
  uptime: z.number(),
  components: z.object({
    database: ComponentStatusSchema,
    redis: ComponentStatusSchema,
    queue: z.object({
      status: z.enum(["ok", "degraded", "down"]),
      waiting: z.number(),
      active: z.number(),
      completed: z.number(),
      failed: z.number(),
    }),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
