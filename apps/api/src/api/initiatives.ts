import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, AppError } from "../middleware/error-handler.js";
import {
  CreateInitiativeBody,
  UploadInitiativeBody,
  ReplanInitiativeBody,
  ListInitiativesQuery,
  InitiativeIdParams,
} from "../models/api-schemas.js";
import * as initiativeService from "../services/initiative.service.js";
import * as planService from "../services/plan.service.js";
import * as featureService from "../services/feature.service.js";
import * as taskService from "../services/task.service.js";
import * as executionService from "../services/execution.service.js";
import { enqueuePlanInitiative } from "../queues/jobs.js";
import { upload } from "../middleware/upload.js";
import { extractTextFromFiles } from "../lib/file-parser.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { runPlanChatAgent } from "../agents/plan-chat.agent.js";

export const initiativeRouter = Router();

// POST /api/initiatives - Create initiative and start pipeline
initiativeRouter.post(
  "/initiatives",
  authMiddleware,
  validate({ body: CreateInitiativeBody }),
  asyncHandler(async (req, res) => {
    const { notionPageId, targetRepo, baseBranch } = req.body as CreateInitiativeBody;
    const user = (req as AuthenticatedRequest).user;

    const initiative = await initiativeService.createInitiative({
      notion_page_id: notionPageId,
      title: `Initiative from ${notionPageId}`,
      status: "pending",
      started_by: user.id,
      metadata: { targetRepo, baseBranch },
    });

    await enqueuePlanInitiative({
      initiativeId: initiative.id,
      notionPageId,
      targetRepo,
      baseBranch,
    });

    res.status(201).json(initiative);
  }),
);

// POST /api/initiatives/upload - Create initiative from direct pitch upload (no Notion)
// Accepts multipart/form-data with optional file attachments
initiativeRouter.post(
  "/initiatives/upload",
  authMiddleware,
  upload.array("files", 5),
  asyncHandler(async (req, res) => {
    const parsed = UploadInitiativeBody.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors.map((e) => e.message).join(", "));
    }

    const {
      title,
      problem,
      solutionSketch,
      noGos,
      risks,
      successCriteria,
      techStack,
      additionalNotes,
      targetRepo,
      baseBranch,
      clientId,
    } = parsed.data;
    const user = (req as AuthenticatedRequest).user;

    // Extract text from attached files
    const files = (req.files as Express.Multer.File[]) ?? [];
    const attachments = files.length > 0 ? await extractTextFromFiles(files) : [];

    const rawContent = {
      title,
      url: null,
      problem,
      solutionSketch,
      noGos,
      risks,
      successCriteria,
      techStack,
      additionalNotes,
      rawBlocks: [],
      attachments,
    };

    const initiative = await initiativeService.createInitiative({
      notion_page_id: `direct-upload-${crypto.randomUUID()}`,
      title,
      raw_content: rawContent,
      status: "pending",
      started_by: user.id,
      client_id: clientId ?? null,
      metadata: { targetRepo: targetRepo || null, baseBranch },
    });

    await enqueuePlanInitiative({
      initiativeId: initiative.id,
      targetRepo: targetRepo || "",
      baseBranch,
    });

    res.status(201).json(initiative);
  }),
);

// POST /api/initiatives/:id/replan - Provide additional context and re-trigger planning
// Accepts multipart/form-data with optional file attachments
initiativeRouter.post(
  "/initiatives/:id/replan",
  authMiddleware,
  upload.array("files", 5),
  asyncHandler(async (req, res) => {
    const idResult = InitiativeIdParams.safeParse(req.params);
    if (!idResult.success) throw new AppError(400, "ID inválido");

    const bodyResult = ReplanInitiativeBody.safeParse(req.body);
    if (!bodyResult.success) throw new AppError(400, "Datos de replanificación inválidos");

    const id = idResult.data.id;
    const { additionalContext } = bodyResult.data;

    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Iniciativa no encontrada");

    const replanAllowedStatuses = ["needs_info", "failed", "planning", "planned", "plan_review"];
    if (!replanAllowedStatuses.includes(initiative.status)) {
      throw new AppError(400, `No se puede replanificar una iniciativa con status "${initiative.status}". Debe ser "needs_info", "failed", "planning", "planned" o "plan_review".`);
    }

    // Extract text from attached files
    const files = (req.files as Express.Multer.File[]) ?? [];
    const attachments = files.length > 0 ? await extractTextFromFiles(files) : [];

    // Build full context with file contents
    let fullContext = additionalContext;
    if (attachments.length > 0) {
      const fileTexts = attachments
        .map((a) => `--- Archivo: ${a.filename} ---\n${a.text}`)
        .join("\n\n");
      fullContext = `${additionalContext}\n\n${fileTexts}`;
    }

    // Merge additional context into metadata
    const currentMetadata = (initiative.metadata as Record<string, unknown>) ?? {};
    const existingContext = (currentMetadata.additionalContext as string) ?? "";
    const mergedContext = existingContext
      ? `${existingContext}\n\n---\n\n${fullContext}`
      : fullContext;

    await initiativeService.updateInitiative(id, {
      metadata: { ...currentMetadata, additionalContext: mergedContext },
    });

    // Re-enqueue planning job — never re-fetch from Notion on replan,
    // raw_content is already stored from the initial planning run.
    const { targetRepo, baseBranch } = currentMetadata as { targetRepo: string; baseBranch: string };
    await enqueuePlanInitiative({
      initiativeId: id,
      targetRepo,
      baseBranch,
    });

    res.json({ message: "Re-planificación iniciada", initiativeId: id });
  }),
);

// PUT /api/initiatives/:id/reupload - Re-upload pitch content and re-trigger planning
// Accepts multipart/form-data with optional file attachments
initiativeRouter.put(
  "/initiatives/:id/reupload",
  authMiddleware,
  upload.array("files", 5),
  asyncHandler(async (req, res) => {
    const idResult = InitiativeIdParams.safeParse(req.params);
    if (!idResult.success) throw new AppError(400, "ID inválido");

    const parsed = UploadInitiativeBody.omit({ clientId: true, targetRepo: true, baseBranch: true }).safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors.map((e) => e.message).join(", "));
    }

    const id = idResult.data.id;
    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Iniciativa no encontrada");

    const reuploadAllowedStatuses = ["needs_info", "failed", "planning", "planned"];
    if (!reuploadAllowedStatuses.includes(initiative.status)) {
      throw new AppError(400, `No se puede re-subir contenido con status "${initiative.status}". Debe ser "needs_info", "failed", "planning" o "planned".`);
    }

    const {
      title,
      problem,
      solutionSketch,
      noGos,
      risks,
      successCriteria,
      techStack,
      additionalNotes,
    } = parsed.data;

    // Extract text from attached files
    const files = (req.files as Express.Multer.File[]) ?? [];
    const attachments = files.length > 0 ? await extractTextFromFiles(files) : [];

    const rawContent = {
      title,
      url: null,
      problem,
      solutionSketch,
      noGos,
      risks,
      successCriteria,
      techStack,
      additionalNotes,
      rawBlocks: [],
      attachments,
    };

    await initiativeService.updateInitiative(id, {
      title,
      raw_content: rawContent as unknown as Record<string, unknown>,
    });

    // Re-enqueue planning job
    const currentMetadata = (initiative.metadata as Record<string, unknown>) ?? {};
    const { targetRepo, baseBranch } = currentMetadata as { targetRepo: string; baseBranch: string };
    await enqueuePlanInitiative({
      initiativeId: id,
      targetRepo,
      baseBranch,
    });

    res.json({ message: "Contenido re-subido y re-planificación iniciada", initiativeId: id });
  }),
);

// GET /api/initiatives/:id/questions - Get planner questions for a needs_info initiative
initiativeRouter.get(
  "/initiatives/:id/questions",
  authMiddleware,
  validate({ params: InitiativeIdParams }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Iniciativa no encontrada");

    const metadata = (initiative.metadata as Record<string, unknown>) ?? {};
    const questions = metadata.plannerQuestions ?? [];
    const analysis = metadata.plannerAnalysis ?? null;

    res.json({
      initiativeId: id,
      status: initiative.status,
      analysis,
      questions,
    });
  }),
);

// DELETE /api/initiatives/:id - Delete an initiative
initiativeRouter.delete(
  "/initiatives/:id",
  authMiddleware,
  validate({ params: InitiativeIdParams }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Iniciativa no encontrada");

    await initiativeService.deleteInitiative(id);
    res.json({ message: "Iniciativa eliminada" });
  }),
);

// PATCH /api/initiatives/:id/repo - Set or update the target repository
initiativeRouter.patch(
  "/initiatives/:id/repo",
  authMiddleware,
  validate({ params: InitiativeIdParams }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const { targetRepo, baseBranch } = req.body as { targetRepo: string; baseBranch?: string };

    if (!targetRepo || typeof targetRepo !== "string" || !targetRepo.trim()) {
      throw new AppError(400, "targetRepo es requerido");
    }

    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Iniciativa no encontrada");

    const currentMetadata = (initiative.metadata as Record<string, unknown>) ?? {};
    await initiativeService.updateInitiative(id, {
      metadata: {
        ...currentMetadata,
        targetRepo: targetRepo.trim(),
        baseBranch: baseBranch?.trim() || currentMetadata.baseBranch || "main",
      },
    });

    res.json({ message: "Repositorio actualizado", targetRepo: targetRepo.trim() });
  }),
);

// POST /api/initiatives/:id/plan/chat - Chat with the planner about the current plan
const PlanChatBody = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .default([]),
});

initiativeRouter.post(
  "/initiatives/:id/plan/chat",
  authMiddleware,
  validate({ params: InitiativeIdParams }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;

    const bodyResult = PlanChatBody.safeParse(req.body);
    if (!bodyResult.success) {
      throw new AppError(400, bodyResult.error.errors.map((e) => e.message).join(", "));
    }

    const { message, history } = bodyResult.data;

    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Iniciativa no encontrada");

    const plan = await planService.getActivePlan(id);
    if (!plan) throw new AppError(404, "No hay un plan activo para esta iniciativa");

    const features = await featureService.getFeaturesByInitiative(id);

    const response = await runPlanChatAgent({
      initiativeId: id,
      plan: {
        summary: plan.summary,
        features: features.map((f) => ({
          title: f.title,
          description: f.description,
          sequence_order: f.sequence_order,
        })),
      },
      history,
      userMessage: message,
    });

    res.json({ response });
  }),
);

// POST /api/initiatives/:id/plan/approve - Approve plan and create features
initiativeRouter.post(
  "/initiatives/:id/plan/approve",
  authMiddleware,
  validate({ params: InitiativeIdParams }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;

    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Iniciativa no encontrada");
    if (initiative.status !== "plan_review") {
      throw new AppError(400, `Solo se puede aprobar un plan con status "plan_review". Status actual: "${initiative.status}".`);
    }

    const plan = await planService.getActivePlan(id);
    if (!plan) throw new AppError(404, "No hay un plan activo para esta iniciativa");

    type RawFeature = {
      title: string;
      description: string;
      acceptanceCriteria: string[];
      userStory: string;
      developerContext?: string;
      estimatedComplexity: string;
    };
    const plannerFeatures = (plan.raw_output as { features?: RawFeature[] } | null)?.features ?? [];
    if (plannerFeatures.length === 0) {
      throw new AppError(400, "El plan no contiene features para crear");
    }

    // Get already-existing features (merged ones migrated to this plan)
    const existingFeatures = await featureService.getFeaturesByInitiative(id);
    const maxExistingOrder = existingFeatures.length > 0
      ? Math.max(...existingFeatures.map((f) => f.sequence_order))
      : 0;

    const featureInserts = plannerFeatures.map((f, i) => ({
      plan_id: plan.id,
      initiative_id: id,
      sequence_order: maxExistingOrder + i + 1,
      title: f.title,
      description: f.description,
      acceptance_criteria: f.acceptanceCriteria,
      user_story: f.userStory,
      developer_context: f.developerContext ?? null,
      status: "pending" as const,
      retry_count: 0,
    }));

    await featureService.createFeatures(featureInserts);
    await initiativeService.updateInitiativeStatus(id, "planned");

    res.json({ message: "Plan aprobado, features creadas", initiativeId: id });
  }),
);

// GET /api/initiatives - List initiatives
initiativeRouter.get(
  "/initiatives",
  authMiddleware,
  validate({ query: ListInitiativesQuery }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ListInitiativesQuery;
    const result = await initiativeService.listInitiatives({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
    });

    res.json({
      data: result.data,
      total: result.total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }),
);

// GET /api/initiatives/:id - Get initiative detail
initiativeRouter.get(
  "/initiatives/:id",
  authMiddleware,
  validate({ params: InitiativeIdParams }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Iniciativa no encontrada");

    const plan = await planService.getActivePlan(id);
    const features = await featureService.getFeaturesByInitiative(id);

    // Get tasks for each feature
    const featuresWithTasks = await Promise.all(
      features.map(async (f) => ({
        ...f,
        tasks: await taskService.getTasksByFeature(f.id),
      })),
    );

    const metrics = await executionService.getExecutionMetrics(id);

    res.json({
      ...initiative,
      plan,
      features: featuresWithTasks,
      metrics,
    });
  }),
);
