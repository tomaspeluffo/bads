import { z } from "zod";

export const pitchStatuses = [
  "pending",
  "generating",
  "ready",
  "failed",
  "converted",
] as const;

export type PitchStatus = (typeof pitchStatuses)[number];

export const PitchContentSchema = z.object({
  executive_summary: z.string(),
  problema: z.string(),
  solucion: z.string(),
  enfoque_tecnico: z.string(),
  entregables: z.array(z.string()),
  metricas_de_exito: z.array(z.string()),
  riesgos: z.array(z.string()),
  proximos_pasos: z.array(z.string()),
});

export type PitchContent = z.infer<typeof PitchContentSchema>;

export const PitchSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid().nullable(),
  title: z.string(),
  brief: z.string(),
  client_name: z.string(),
  status: z.enum(pitchStatuses),
  content: PitchContentSchema.nullable(),
  error_message: z.string().nullable(),
  initiative_id: z.string().uuid().nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Pitch = z.infer<typeof PitchSchema>;

export const InsertPitchSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  brief: z.string().min(1),
  client_name: z.string().min(1),
  created_by: z.string().uuid().nullable().optional(),
});

export type InsertPitch = z.infer<typeof InsertPitchSchema>;
