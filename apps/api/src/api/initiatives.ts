import { Router } from "express";
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
      responsable,
      soporte,
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
      responsable,
      soporte,
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
      metadata: { targetRepo, baseBranch },
    });

    await enqueuePlanInitiative({
      initiativeId: initiative.id,
      targetRepo,
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
    if (!bodyResult.success) throw new AppError(400, "Contexto adicional requerido");

    const id = idResult.data.id;
    const { additionalContext } = bodyResult.data;

    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Iniciativa no encontrada");

    if (initiative.status !== "needs_info" && initiative.status !== "failed") {
      throw new AppError(400, `No se puede replanificar una iniciativa con status "${initiative.status}". Debe ser "needs_info" o "failed".`);
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

    // Re-enqueue planning job
    const { targetRepo, baseBranch } = currentMetadata as { targetRepo: string; baseBranch: string };
    await enqueuePlanInitiative({
      initiativeId: id,
      targetRepo,
      baseBranch,
    });

    res.json({ message: "Re-planificación iniciada", initiativeId: id });
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
