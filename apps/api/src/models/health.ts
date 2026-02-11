import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
