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
initiativeRouter.post(
  "/initiatives/upload",
  authMiddleware,
  validate({ body: UploadInitiativeBody }),
  asyncHandler(async (req, res) => {
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
    } = req.body as UploadInitiativeBody;
    const user = (req as AuthenticatedRequest).user;

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
    };

    const initiative = await initiativeService.createInitiative({
      notion_page_id: `direct-upload-${crypto.randomUUID()}`,
      title,
      raw_content: rawContent,
      status: "pending",
      started_by: user.id,
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
initiativeRouter.post(
  "/initiatives/:id/replan",
  authMiddleware,
  validate({ params: InitiativeIdParams, body: ReplanInitiativeBody }),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const { additionalContext } = req.body as ReplanInitiativeBody;

    const initiative = await initiativeService.getInitiativeById(id);
    if (!initiative) throw new AppError(404, "Initiative not found");

    if (initiative.status !== "needs_info" && initiative.status !== "failed") {
      throw new AppError(400, `Cannot replan initiative with status "${initiative.status}". Must be "needs_info" or "failed".`);
    }

    // Merge additional context into metadata
    const currentMetadata = (initiative.metadata as Record<string, unknown>) ?? {};
    const existingContext = (currentMetadata.additionalContext as string) ?? "";
    const mergedContext = existingContext
      ? `${existingContext}\n\n---\n\n${additionalContext}`
      : additionalContext;

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

    res.json({ message: "Re-planning initiated", initiativeId: id });
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
    if (!initiative) throw new AppError(404, "Initiative not found");

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
