import { z } from "zod";
import { PAGINATION, REJECTION_FEEDBACK_MIN_LENGTH } from "../config/constants.js";
import { initiativeStatuses } from "./initiative.js";
import { memoryTypes } from "./memory-entry.js";

// --- Initiatives ---

export const CreateInitiativeBody = z.object({
  notionPageId: z.string().min(1),
  targetRepo: z.string().min(1), // e.g. "owner/repo"
  baseBranch: z.string().default("main"),
});

export type CreateInitiativeBody = z.infer<typeof CreateInitiativeBody>;

export const UploadInitiativeBody = z.object({
  title: z.string().min(1),
  problem: z.string().min(1),
  solutionSketch: z.string().min(1),
  noGos: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  responsable: z.string().default(""),
  soporte: z.string().default(""),
  targetRepo: z.string().min(1),
  baseBranch: z.string().default("main"),
});

export type UploadInitiativeBody = z.infer<typeof UploadInitiativeBody>;

export const ListInitiativesQuery = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  status: z.enum(initiativeStatuses).optional(),
});

export type ListInitiativesQuery = z.infer<typeof ListInitiativesQuery>;

export const InitiativeIdParams = z.object({
  id: z.string().uuid(),
});

// --- Features ---

export const FeatureActionParams = z.object({
  id: z.string().uuid(),
  fid: z.string().uuid(),
});

export const RejectFeatureBody = z.object({
  feedback: z.string().min(REJECTION_FEEDBACK_MIN_LENGTH, {
    message: `Feedback must be at least ${REJECTION_FEEDBACK_MIN_LENGTH} characters`,
  }),
});

export type RejectFeatureBody = z.infer<typeof RejectFeatureBody>;

// --- Memory ---

export const ListPatternsQuery = z.object({
  category: z.string().optional(),
  type: z.enum(memoryTypes).optional(),
  tags: z
    .string()
    .transform((s) => s.split(",").map((t) => t.trim()))
    .optional(),
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
});

export type ListPatternsQuery = z.infer<typeof ListPatternsQuery>;

// --- Webhooks ---

export const NotionWebhookBody = z.object({}).passthrough();
