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

// Helper: accept a single string or array from multipart form data
const stringOrArray = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : [v]).filter(Boolean))
  .default([]);

export const UploadInitiativeBody = z.object({
  title: z.string().min(1),
  problem: z.string().min(1),
  solutionSketch: z.string().min(1),
  noGos: stringOrArray,
  risks: stringOrArray,
  successCriteria: z.string().default(""),
  techStack: z.string().default(""),
  additionalNotes: z.string().default(""),
  responsable: z.string().default(""),
  soporte: z.string().default(""),
  targetRepo: z.string().default(""),
  baseBranch: z.string().default("main"),
  clientId: z.string().uuid().optional(),
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

export const ReplanInitiativeBody = z.object({
  additionalContext: z.string().min(1),
});

export type ReplanInitiativeBody = z.infer<typeof ReplanInitiativeBody>;

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

// --- Clients ---

export const CreateClientBody = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().optional(),
});

export type CreateClientBody = z.infer<typeof CreateClientBody>;

export const ClientIdParams = z.object({
  clientId: z.string().uuid(),
});

// --- Auth ---

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginBody = z.infer<typeof LoginBody>;

// --- GitHub ---

export const CreateRepoBody = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9._-]+$/, "Nombre de repositorio inválido"),
  isPrivate: z.boolean().default(false),
});

export type CreateRepoBody = z.infer<typeof CreateRepoBody>;

// --- Webhooks ---

export const NotionWebhookBody = z.object({}).passthrough();
