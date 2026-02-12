import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, AppError } from "../middleware/error-handler.js";
import {
  CreateInitiativeBody,
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
